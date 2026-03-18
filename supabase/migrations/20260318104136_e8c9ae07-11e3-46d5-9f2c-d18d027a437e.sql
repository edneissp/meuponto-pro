ALTER TABLE public.supplier_delivery_items
ADD COLUMN IF NOT EXISTS expiry_date date;

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'direct';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenants_origin_check'
      AND conrelid = 'public.tenants'::regclass
  ) THEN
    ALTER TABLE public.tenants
    ADD CONSTRAINT tenants_origin_check
    CHECK (origin IN ('direct', 'demo'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id UUID;
BEGIN
  INSERT INTO public.tenants (
    name,
    trial_start,
    trial_end,
    plano,
    ativo,
    subscription_status,
    origin
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'Meu Estabelecimento'),
    CURRENT_DATE,
    CURRENT_DATE + interval '30 days',
    'trial',
    true,
    'trial',
    COALESCE(NEW.raw_user_meta_data->>'origin', 'direct')
  )
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.profiles (user_id, tenant_id, full_name)
  VALUES (NEW.id, new_tenant_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'owner');

  RETURN NEW;
END;
$function$;