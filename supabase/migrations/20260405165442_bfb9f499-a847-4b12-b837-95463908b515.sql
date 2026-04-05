
-- Create tables (mesas) table
CREATE TABLE public.tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  table_name TEXT,
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, table_number)
);

-- Indexes
CREATE INDEX idx_tables_tenant ON public.tables(tenant_id);
CREATE INDEX idx_tables_status ON public.tables(tenant_id, status);

-- Enable RLS
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Tenant isolation" ON public.tables
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Trigger for updated_at
CREATE TRIGGER update_tables_updated_at
  BEFORE UPDATE ON public.tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add table_id to orders
ALTER TABLE public.orders ADD COLUMN table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL;
CREATE INDEX idx_orders_table_id ON public.orders(table_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
