
-- Fix: Split tenant isolation into SELECT/UPDATE/DELETE only (not INSERT)
-- This prevents it from blocking public order inserts

-- Orders table
DROP POLICY IF EXISTS "Tenant isolation" ON public.orders;

CREATE POLICY "Tenant isolation select"
ON public.orders AS RESTRICTIVE
FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation update"
ON public.orders AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation delete"
ON public.orders AS RESTRICTIVE
FOR DELETE TO authenticated
USING (tenant_id = get_user_tenant_id());

-- Order items table
DROP POLICY IF EXISTS "Tenant isolation" ON public.order_items;

CREATE POLICY "Tenant isolation select"
ON public.order_items AS RESTRICTIVE
FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation update"
ON public.order_items AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation delete"
ON public.order_items AS RESTRICTIVE
FOR DELETE TO authenticated
USING (tenant_id = get_user_tenant_id());
