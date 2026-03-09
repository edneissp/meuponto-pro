
-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Tenant isolation" ON public.fiados;

CREATE POLICY "Tenant isolation"
ON public.fiados
FOR ALL
TO authenticated
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());
