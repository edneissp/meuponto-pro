DROP VIEW IF EXISTS public.public_tenants;

CREATE VIEW public.public_tenants AS
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
FROM tenants
WHERE ativo = true;

GRANT SELECT ON public.public_tenants TO anon;
GRANT SELECT ON public.public_tenants TO authenticated;