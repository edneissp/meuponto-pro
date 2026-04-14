
CREATE TABLE public.fiscal_api_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'focus_nfe',
  environment TEXT NOT NULL DEFAULT 'homologacao',
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  webhook_url TEXT,
  certificate_url TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  last_test_at TIMESTAMP WITH TIME ZONE,
  last_test_result TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.fiscal_api_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.fiscal_api_config
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_fiscal_api_config_updated_at
  BEFORE UPDATE ON public.fiscal_api_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
