
-- Fiscal settings per tenant
CREATE TABLE public.fiscal_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  inscricao_estadual TEXT,
  regime_tributario TEXT DEFAULT 'simples_nacional',
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.fiscal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.fiscal_settings
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_fiscal_settings_updated_at
  BEFORE UPDATE ON public.fiscal_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Fiscal documents
CREATE TABLE public.fiscal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id),
  type TEXT NOT NULL DEFAULT 'nfce',
  number TEXT,
  series TEXT DEFAULT '1',
  customer_name TEXT,
  customer_document TEXT,
  customer_email TEXT,
  customer_address TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  api_reference TEXT,
  xml_url TEXT,
  pdf_url TEXT,
  cancel_reason TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.fiscal_documents
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_fiscal_documents_updated_at
  BEFORE UPDATE ON public.fiscal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_fiscal_documents_tenant ON public.fiscal_documents(tenant_id);
CREATE INDEX idx_fiscal_documents_status ON public.fiscal_documents(status);
CREATE INDEX idx_fiscal_documents_created ON public.fiscal_documents(created_at);
CREATE INDEX idx_fiscal_documents_sale ON public.fiscal_documents(sale_id);
