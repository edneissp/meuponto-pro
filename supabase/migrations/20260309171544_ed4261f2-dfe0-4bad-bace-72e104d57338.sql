
-- Create optional_groups table
CREATE TABLE public.optional_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.optional_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.optional_groups
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Create optionals table
CREATE TABLE public.optionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  group_id UUID NOT NULL REFERENCES public.optional_groups(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.optionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.optionals
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Create product_option_groups junction table
CREATE TABLE public.product_option_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.optional_groups(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  UNIQUE(product_id, group_id)
);

ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.product_option_groups
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Create sale_item_optionals to track which optionals were selected per sale item
CREATE TABLE public.sale_item_optionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_item_id UUID NOT NULL REFERENCES public.sale_items(id) ON DELETE CASCADE,
  optional_id UUID NOT NULL REFERENCES public.optionals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
);

ALTER TABLE public.sale_item_optionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.sale_item_optionals
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());
