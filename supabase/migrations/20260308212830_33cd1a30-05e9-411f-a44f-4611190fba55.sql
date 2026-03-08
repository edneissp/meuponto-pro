
-- Drop restrictive policies on orders for UPDATE and recreate as permissive
DROP POLICY IF EXISTS "Tenant isolation update" ON public.orders;
CREATE POLICY "Tenant isolation update" ON public.orders
  FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Also fix DELETE policy
DROP POLICY IF EXISTS "Tenant isolation delete" ON public.orders;
CREATE POLICY "Tenant isolation delete" ON public.orders
  FOR DELETE
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

-- Fix SELECT policies too
DROP POLICY IF EXISTS "Tenant isolation select" ON public.orders;
CREATE POLICY "Tenant isolation select" ON public.orders
  FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());
