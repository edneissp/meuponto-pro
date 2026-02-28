
-- Add subscription status to tenants
ALTER TABLE public.tenants 
ADD COLUMN subscription_status text NOT NULL DEFAULT 'pending';

-- Add index for admin queries
CREATE INDEX idx_tenants_subscription_status ON public.tenants(subscription_status);

-- Add admin to app_role enum
ALTER TYPE public.app_role ADD VALUE 'admin';
