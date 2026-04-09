
-- Create discount_campaigns table
CREATE TABLE public.discount_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  discount_price NUMERIC NOT NULL DEFAULT 0,
  normal_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  duration_days INTEGER NOT NULL DEFAULT 90,
  max_users INTEGER NOT NULL DEFAULT 100,
  current_users INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_campaigns ENABLE ROW LEVEL SECURITY;

-- Admins can manage all campaigns
CREATE POLICY "Admins can manage campaigns"
  ON public.discount_campaigns FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view active campaigns (for subscription page)
CREATE POLICY "Authenticated can view active campaigns"
  ON public.discount_campaigns FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Trigger for updated_at
CREATE TRIGGER update_discount_campaigns_updated_at
  BEFORE UPDATE ON public.discount_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create discount_coupons table
CREATE TABLE public.discount_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'percentage',
  value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  campaign_id UUID REFERENCES public.discount_campaigns(id) ON DELETE SET NULL,
  usage_limit INTEGER NOT NULL DEFAULT 0,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;

-- Admins can manage all coupons
CREATE POLICY "Admins can manage coupons"
  ON public.discount_coupons FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view active coupons (for validation)
CREATE POLICY "Authenticated can view active coupons"
  ON public.discount_coupons FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Trigger for updated_at
CREATE TRIGGER update_discount_coupons_updated_at
  BEFORE UPDATE ON public.discount_coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create coupon_redemptions table
CREATE TABLE public.coupon_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.discount_coupons(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.discount_campaigns(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  discount_applied NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all redemptions
CREATE POLICY "Admins can manage redemptions"
  ON public.coupon_redemptions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Tenants can view own redemptions
CREATE POLICY "Tenants can view own redemptions"
  ON public.coupon_redemptions FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

-- Indexes for performance
CREATE INDEX idx_discount_campaigns_status ON public.discount_campaigns(status);
CREATE INDEX idx_discount_coupons_code ON public.discount_coupons(code);
CREATE INDEX idx_discount_coupons_status ON public.discount_coupons(status);
CREATE INDEX idx_discount_coupons_campaign ON public.discount_coupons(campaign_id);
CREATE INDEX idx_coupon_redemptions_tenant ON public.coupon_redemptions(tenant_id);
CREATE INDEX idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);
