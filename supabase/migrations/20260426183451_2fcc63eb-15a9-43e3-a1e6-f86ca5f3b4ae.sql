ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS coupon_used text,
ADD COLUMN IF NOT EXISTS promo_expires_at timestamp with time zone;

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS billing_amount numeric NOT NULL DEFAULT 119.90,
ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS promo_active boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS promo_expires_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.coupon_usage_counts (
  code text PRIMARY KEY,
  usage_count integer NOT NULL DEFAULT 0,
  max_uses integer NOT NULL DEFAULT 100,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_usage_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view coupon usage counts" ON public.coupon_usage_counts;
CREATE POLICY "Admins can view coupon usage counts"
ON public.coupon_usage_counts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.coupon_usage_counts (code, usage_count, max_uses)
VALUES ('PRIMEIROS100', 0, 100)
ON CONFLICT (code) DO UPDATE
SET max_uses = 100,
    updated_at = now();