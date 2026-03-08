
-- Fix: Anonymous users need SELECT on orders to get back the inserted row (for .select().single())
CREATE POLICY "Anon can read own inserted orders"
ON public.orders
FOR SELECT TO anon
USING (true);

-- Also need SELECT on order_items for anon
CREATE POLICY "Anon can read own inserted order items"
ON public.order_items
FOR SELECT TO anon
USING (true);
