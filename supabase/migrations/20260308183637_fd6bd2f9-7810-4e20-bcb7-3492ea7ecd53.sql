
-- Add description column to products for menu display
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description text;

-- Create orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  order_number integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'digital_menu',
  status text NOT NULL DEFAULT 'received',
  customer_name text,
  customer_phone text,
  table_number text,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total numeric NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can manage orders in their tenant
CREATE POLICY "Tenant isolation" ON public.orders FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation" ON public.order_items FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- RLS: anonymous users can place orders (insert) and view their orders
CREATE POLICY "Public can place orders" ON public.orders FOR INSERT TO anon
WITH CHECK (true);

CREATE POLICY "Public can insert order items" ON public.order_items FOR INSERT TO anon
WITH CHECK (true);

-- RLS: anonymous users can read products and categories for the menu
CREATE POLICY "Public can view active products" ON public.products FOR SELECT TO anon
USING (is_active = true);

CREATE POLICY "Public can view categories" ON public.categories FOR SELECT TO anon
USING (true);

CREATE POLICY "Public can view tenant info" ON public.tenants FOR SELECT TO anon
USING (true);

-- Auto-increment order number per tenant
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO NEW.order_number
  FROM public.orders WHERE tenant_id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_order_number_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- Update trigger for orders
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
