
-- =============================================
-- 1. AUDIT LOGS TABLE
-- =============================================
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id uuid,
  action text NOT NULL,
  module text NOT NULL,
  reference_id uuid,
  old_data jsonb DEFAULT '{}'::jsonb,
  new_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own tenant logs"
  ON public.audit_logs FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert own tenant logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id() OR has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 2. INDEXES FOR AUDIT_LOGS
-- =============================================
CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_module ON public.audit_logs(module);

-- =============================================
-- 3. PERFORMANCE INDEXES ON MAIN TABLES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON public.expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON public.expenses(due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON public.expenses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fiados_tenant_id ON public.fiados(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fiados_created_at ON public.fiados(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_id ON public.stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tables_tenant_id ON public.tables(tenant_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON public.suppliers(tenant_id);

CREATE INDEX IF NOT EXISTS idx_supplier_deliveries_tenant_id ON public.supplier_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_deliveries_created_at ON public.supplier_deliveries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at ON public.tenants(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_plano ON public.tenants(plano);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON public.tenants(subscription_status);
