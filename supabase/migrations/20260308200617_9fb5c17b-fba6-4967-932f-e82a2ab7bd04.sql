
-- Fix: Make public insert policies PERMISSIVE so anonymous users can place orders
-- Drop restrictive policies
DROP POLICY IF EXISTS "Public can place orders" ON public.orders;
DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;

-- Recreate as PERMISSIVE
CREATE POLICY "Public can place orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public can insert order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Also add whatsapp column to tenants for WhatsApp confirmation
ALTER TABLE public.tenants ADD COLUMN whatsapp text DEFAULT NULL;
