
ALTER TABLE public.tenants 
  ADD COLUMN free_delivery_radius_km numeric NOT NULL DEFAULT 1,
  ADD COLUMN delivery_fee_per_km numeric NOT NULL DEFAULT 2,
  ADD COLUMN store_lat double precision DEFAULT NULL,
  ADD COLUMN store_lng double precision DEFAULT NULL;
