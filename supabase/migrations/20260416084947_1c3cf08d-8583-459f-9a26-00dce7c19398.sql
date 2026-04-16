
CREATE TABLE public.table_closings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  table_number INTEGER NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  service_fee NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  split_type TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.table_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.table_closings
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE INDEX idx_table_closings_tenant ON public.table_closings(tenant_id);
CREATE INDEX idx_table_closings_table ON public.table_closings(table_id);
CREATE INDEX idx_table_closings_closed_at ON public.table_closings(closed_at);

-- Also enable realtime for table_closings
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_closings;
