-- Secure public tenant access for digital menu and order tracking while preserving multi-tenant behavior
DROP POLICY IF EXISTS "Public can view tenant info" ON public.tenants;
DROP POLICY IF EXISTS "Anon can read own inserted orders" ON public.orders;
DROP POLICY IF EXISTS "Anon can read own inserted order items" ON public.order_items;

-- Public-safe identifier for menu access
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS public_slug text;

UPDATE public.tenants
SET public_slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 8)
WHERE public_slug IS NULL;

ALTER TABLE public.tenants
ALTER COLUMN public_slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_public_slug ON public.tenants(public_slug);

-- Order public tracking token
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS public_token uuid DEFAULT gen_random_uuid();

UPDATE public.orders
SET public_token = gen_random_uuid()
WHERE public_token IS NULL;

ALTER TABLE public.orders
ALTER COLUMN public_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_public_token ON public.orders(public_token);

-- Supplier deliveries operational status fields
ALTER TABLE public.supplier_deliveries
ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'received',
ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_deliveries_payment_status ON public.supplier_deliveries(payment_status);
CREATE INDEX IF NOT EXISTS idx_supplier_deliveries_delivery_status ON public.supplier_deliveries(delivery_status);

-- Public-safe view for digital menu
CREATE OR REPLACE VIEW public.public_tenants AS
SELECT
  id,
  public_slug,
  name,
  logo_url,
  primary_color,
  delivery_fee,
  free_delivery_radius_km,
  delivery_fee_per_km,
  store_lat,
  store_lng,
  whatsapp,
  pix_key,
  ativo
FROM public.tenants
WHERE ativo = true;

GRANT SELECT ON public.public_tenants TO anon, authenticated;

-- Restrict public order reads to token-based tracking only
CREATE POLICY "Anon can read order by public token"
ON public.orders
FOR SELECT
TO anon
USING (public_token::text = current_setting('request.jwt.claims', true)::jsonb ->> 'order_token');

-- Restrict public order item reads to items of token-authorized orders
CREATE POLICY "Anon can read order items by order token"
ON public.order_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.public_token::text = current_setting('request.jwt.claims', true)::jsonb ->> 'order_token'
  )
);

-- Delivery status validation
CREATE OR REPLACE FUNCTION public.validate_supplier_delivery_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_status NOT IN ('received', 'processing', 'completed', 'canceled') THEN
    RAISE EXCEPTION 'invalid delivery_status: %', NEW.delivery_status;
  END IF;

  IF NEW.payment_status NOT IN ('pending', 'partial', 'paid') THEN
    RAISE EXCEPTION 'invalid payment_status: %', NEW.payment_status;
  END IF;

  IF NEW.payment_status = 'paid' AND NEW.payment_date IS NULL THEN
    NEW.payment_date := now();
  ELSIF NEW.payment_status <> 'paid' THEN
    NEW.payment_date := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_supplier_delivery_state_trigger ON public.supplier_deliveries;
CREATE TRIGGER validate_supplier_delivery_state_trigger
BEFORE INSERT OR UPDATE ON public.supplier_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.validate_supplier_delivery_state();