-- Tabela de uso de tenants
CREATE TABLE public.tenant_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  actions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_usage_tenant_id ON public.tenant_usage(tenant_id);
CREATE INDEX idx_tenant_usage_last_activity ON public.tenant_usage(last_activity_at DESC);
CREATE INDEX idx_tenant_usage_last_login ON public.tenant_usage(last_login_at DESC);

ALTER TABLE public.tenant_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all tenant usage"
ON public.tenant_usage FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenants can view own usage"
ON public.tenant_usage FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

-- Função para registrar login
CREATE OR REPLACE FUNCTION public.track_tenant_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_tenant UUID;
BEGIN
  current_tenant := get_user_tenant_id();
  IF current_tenant IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.tenant_usage (tenant_id, last_login_at, login_count, last_activity_at)
  VALUES (current_tenant, now(), 1, now())
  ON CONFLICT (tenant_id) DO UPDATE
    SET last_login_at = now(),
        login_count = tenant_usage.login_count + 1,
        last_activity_at = now(),
        updated_at = now();
END;
$$;

-- Função para registrar atividade
CREATE OR REPLACE FUNCTION public.track_tenant_activity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_tenant UUID;
BEGIN
  current_tenant := get_user_tenant_id();
  IF current_tenant IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.tenant_usage (tenant_id, last_activity_at, actions_count)
  VALUES (current_tenant, now(), 1)
  ON CONFLICT (tenant_id) DO UPDATE
    SET last_activity_at = now(),
        actions_count = tenant_usage.actions_count + 1,
        updated_at = now();
END;
$$;

-- Trigger automática para vendas, produtos e pedidos
CREATE OR REPLACE FUNCTION public.trigger_track_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_usage (tenant_id, last_activity_at, actions_count)
  VALUES (NEW.tenant_id, now(), 1)
  ON CONFLICT (tenant_id) DO UPDATE
    SET last_activity_at = now(),
        actions_count = tenant_usage.actions_count + 1,
        updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_activity_on_sale
AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.trigger_track_activity();

CREATE TRIGGER track_activity_on_product
AFTER INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.trigger_track_activity();

CREATE TRIGGER track_activity_on_order
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trigger_track_activity();