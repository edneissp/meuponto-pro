
-- Add trial columns to tenants table
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS trial_start date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS trial_end date DEFAULT (CURRENT_DATE + interval '30 days'),
  ADD COLUMN IF NOT EXISTS plano text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- Update existing tenants that are active to keep them as 'active' plan
UPDATE public.tenants SET plano = 'active' WHERE subscription_status = 'active';
UPDATE public.tenants SET plano = 'free' WHERE subscription_status = 'free';

-- Update handle_new_user to set trial fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create a new tenant with trial period
  INSERT INTO public.tenants (name, trial_start, trial_end, plano, ativo, subscription_status)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'Meu Estabelecimento'),
    CURRENT_DATE,
    CURRENT_DATE + interval '30 days',
    'trial',
    true,
    'trial'
  )
  RETURNING id INTO new_tenant_id;
  
  -- Create profile
  INSERT INTO public.profiles (user_id, tenant_id, full_name)
  VALUES (NEW.id, new_tenant_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Assign owner role
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'owner');
  
  RETURN NEW;
END;
$function$;
