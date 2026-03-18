ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS billing_country_code TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS billing_country_source TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS billing_currency TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS billing_gateway TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS billing_contact_email TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS billing_customer_name TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS billing_detection_checked_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  plan_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  trial_end TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'trial',
  gateway TEXT NOT NULL DEFAULT 'asaas',
  gateway_subscription_id TEXT,
  customer_country TEXT,
  customer_country_source TEXT,
  preferred_payment_method TEXT,
  customer_email TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_gateway TEXT NOT NULL,
  gateway_payment_id TEXT,
  gateway_event_id TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  invoice_url TEXT,
  download_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_gateway ON public.invoices(payment_gateway);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_retry_schedule ON public.invoices(next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON public.subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_tenant ON public.billing_webhook_events(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number_unique ON public.invoices(invoice_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_gateway_event_unique ON public.invoices(gateway_event_id) WHERE gateway_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_webhook_events_gateway_event_unique ON public.billing_webhook_events(gateway, event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_one_current_per_tenant ON public.subscriptions(tenant_id) WHERE status IN ('active', 'trial', 'past_due', 'suspended');

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'INV-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'Admins can manage all subscriptions'
  ) THEN
    CREATE POLICY "Admins can manage all subscriptions"
    ON public.subscriptions
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'Tenants can view own subscriptions'
  ) THEN
    CREATE POLICY "Tenants can view own subscriptions"
    ON public.subscriptions
    FOR SELECT
    TO authenticated
    USING (tenant_id = public.get_user_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'Admins can manage all invoices'
  ) THEN
    CREATE POLICY "Admins can manage all invoices"
    ON public.invoices
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'Tenants can view own invoices'
  ) THEN
    CREATE POLICY "Tenants can view own invoices"
    ON public.invoices
    FOR SELECT
    TO authenticated
    USING (tenant_id = public.get_user_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'billing_webhook_events' AND policyname = 'Admins can view billing webhook events'
  ) THEN
    CREATE POLICY "Admins can view billing webhook events"
    ON public.billing_webhook_events
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER on_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_invoices_updated_at'
  ) THEN
    CREATE TRIGGER on_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;