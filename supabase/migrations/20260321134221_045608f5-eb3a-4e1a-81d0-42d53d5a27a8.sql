
-- Fix handle_new_user trigger to include required public_slug
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id UUID;
  generated_slug TEXT;
BEGIN
  generated_slug := 't-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

  INSERT INTO public.tenants (
    name,
    public_slug,
    trial_start,
    trial_end,
    plano,
    ativo,
    subscription_status,
    origin
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'Meu Estabelecimento'),
    generated_slug,
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

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON public.sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_supplier_deliveries_payment_status ON public.supplier_deliveries(payment_status);
CREATE INDEX IF NOT EXISTS idx_supplier_deliveries_tenant_id ON public.supplier_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fiados_tenant_paid ON public.fiados(tenant_id, paid);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_paid ON public.expenses(tenant_id, paid);
