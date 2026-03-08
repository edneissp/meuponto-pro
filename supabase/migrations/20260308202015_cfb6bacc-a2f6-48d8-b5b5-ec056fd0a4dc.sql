
-- Fix: Make public insert policies PERMISSIVE (not restrictive)
-- The issue is that RESTRICTIVE "Tenant isolation" blocks anon users

-- Orders table
DROP POLICY IF EXISTS "Public can place orders" ON public.orders;
CREATE POLICY "Public can place orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Order items table  
DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
CREATE POLICY "Public can insert order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Fix tenant isolation to only apply to authenticated users (not anon)
-- Orders
DROP POLICY IF EXISTS "Tenant isolation" ON public.orders;
CREATE POLICY "Tenant isolation"
ON public.orders
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- Order items
DROP POLICY IF EXISTS "Tenant isolation" ON public.order_items;
CREATE POLICY "Tenant isolation"
ON public.order_items
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());
