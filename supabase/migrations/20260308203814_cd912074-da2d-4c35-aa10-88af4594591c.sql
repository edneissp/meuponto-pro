
-- Fix: Add PERMISSIVE SELECT policy for authenticated users
-- Without a permissive policy, restrictive-only policies return zero rows

CREATE POLICY "Authenticated can select orders"
ON public.orders
FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authenticated can select order items"
ON public.order_items
FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id());
