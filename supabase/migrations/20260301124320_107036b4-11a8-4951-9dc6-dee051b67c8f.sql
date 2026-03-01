
-- Customers table for fiado tracking
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.customers AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Fiado (credit/tab) records
CREATE TABLE public.fiados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  sale_id UUID REFERENCES public.sales(id),
  amount NUMERIC NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fiados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.fiados AS RESTRICTIVE FOR ALL
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE INDEX idx_fiados_customer_id ON public.fiados(customer_id);
CREATE INDEX idx_fiados_tenant_paid ON public.fiados(tenant_id, paid);
CREATE INDEX idx_customers_tenant_id ON public.customers(tenant_id);
