
-- Tabela para rastrear pagamentos dos tenants
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 50.00,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, refunded
  payment_method TEXT,
  mercado_pago_payment_id TEXT,
  mercado_pago_preference_id TEXT,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  period_end DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage payments
CREATE POLICY "Admins can manage all payments"
ON public.payments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Tenant owners can view their own payments
CREATE POLICY "Owners can view their payments"
ON public.payments
FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Index for faster lookups
CREATE INDEX idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_mercado_pago_id ON public.payments(mercado_pago_payment_id);
