ALTER TABLE public.tenant_usage
  ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_activated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;

-- Atualizar função de login para refletir status de trial
CREATE OR REPLACE FUNCTION public.track_tenant_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_tenant UUID;
  t_record RECORD;
BEGIN
  current_tenant := get_user_tenant_id();
  IF current_tenant IS NULL THEN RETURN; END IF;

  SELECT subscription_status, plano, trial_start
  INTO t_record FROM public.tenants WHERE id = current_tenant;

  INSERT INTO public.tenant_usage (tenant_id, last_login_at, login_count, last_activity_at, is_trial, trial_started_at)
  VALUES (
    current_tenant, now(), 1, now(),
    COALESCE(t_record.plano = 'trial' OR t_record.subscription_status = 'trial', false),
    COALESCE(t_record.trial_start::timestamptz, now())
  )
  ON CONFLICT (tenant_id) DO UPDATE
    SET last_login_at = now(),
        login_count = tenant_usage.login_count + 1,
        is_trial = COALESCE(t_record.plano = 'trial' OR t_record.subscription_status = 'trial', tenant_usage.is_trial),
        updated_at = now();
END;
$$;

-- Atualizar trigger de atividade para marcar ativação
CREATE OR REPLACE FUNCTION public.trigger_track_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_usage (tenant_id, last_activity_at, actions_count, is_activated, activated_at)
  VALUES (NEW.tenant_id, now(), 1, true, now())
  ON CONFLICT (tenant_id) DO UPDATE
    SET last_activity_at = now(),
        actions_count = tenant_usage.actions_count + 1,
        is_activated = true,
        activated_at = COALESCE(tenant_usage.activated_at, now()),
        updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger também para abertura de mesa (ocupação)
CREATE OR REPLACE FUNCTION public.trigger_track_table_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'occupied' AND (OLD.status IS DISTINCT FROM 'occupied') THEN
    INSERT INTO public.tenant_usage (tenant_id, last_activity_at, actions_count, is_activated, activated_at)
    VALUES (NEW.tenant_id, now(), 1, true, now())
    ON CONFLICT (tenant_id) DO UPDATE
      SET last_activity_at = now(),
          actions_count = tenant_usage.actions_count + 1,
          is_activated = true,
          activated_at = COALESCE(tenant_usage.activated_at, now()),
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_activity_on_table_open ON public.tables;
CREATE TRIGGER track_activity_on_table_open
AFTER UPDATE ON public.tables
FOR EACH ROW EXECUTE FUNCTION public.trigger_track_table_open();

-- Inicializar registros para tenants em trial existentes
INSERT INTO public.tenant_usage (tenant_id, is_trial, trial_started_at)
SELECT t.id, true, t.trial_start::timestamptz
FROM public.tenants t
WHERE (t.plano = 'trial' OR t.subscription_status = 'trial')
  AND t.deleted_at IS NULL
ON CONFLICT (tenant_id) DO UPDATE
  SET is_trial = true,
      trial_started_at = COALESCE(tenant_usage.trial_started_at, EXCLUDED.trial_started_at);