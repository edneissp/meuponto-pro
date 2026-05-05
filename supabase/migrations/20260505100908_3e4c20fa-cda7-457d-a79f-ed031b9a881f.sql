-- Add nullable store_id columns
ALTER TABLE public.products ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.sale_items ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.tables ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

-- Backfill existing rows to default store of their tenant
UPDATE public.products p SET store_id = s.id
  FROM public.stores s WHERE s.tenant_id = p.tenant_id AND s.is_default = true AND p.store_id IS NULL;
UPDATE public.sales x SET store_id = s.id
  FROM public.stores s WHERE s.tenant_id = x.tenant_id AND s.is_default = true AND x.store_id IS NULL;
UPDATE public.sale_items x SET store_id = s.id
  FROM public.stores s WHERE s.tenant_id = x.tenant_id AND s.is_default = true AND x.store_id IS NULL;
UPDATE public.orders x SET store_id = s.id
  FROM public.stores s WHERE s.tenant_id = x.tenant_id AND s.is_default = true AND x.store_id IS NULL;
UPDATE public.order_items x SET store_id = s.id
  FROM public.stores s WHERE s.tenant_id = x.tenant_id AND s.is_default = true AND x.store_id IS NULL;
UPDATE public.tables x SET store_id = s.id
  FROM public.stores s WHERE s.tenant_id = x.tenant_id AND s.is_default = true AND x.store_id IS NULL;
UPDATE public.expenses x SET store_id = s.id
  FROM public.stores s WHERE s.tenant_id = x.tenant_id AND s.is_default = true AND x.store_id IS NULL;

-- Indexes
CREATE INDEX idx_products_store ON public.products(store_id);
CREATE INDEX idx_sales_store ON public.sales(store_id);
CREATE INDEX idx_sale_items_store ON public.sale_items(store_id);
CREATE INDEX idx_orders_store ON public.orders(store_id);
CREATE INDEX idx_order_items_store ON public.order_items(store_id);
CREATE INDEX idx_tables_store ON public.tables(store_id);
CREATE INDEX idx_expenses_store ON public.expenses(store_id);