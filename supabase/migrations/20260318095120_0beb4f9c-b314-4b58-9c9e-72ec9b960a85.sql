CREATE TABLE IF NOT EXISTS public.fiado_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  fiado_id uuid NOT NULL REFERENCES public.fiados(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fiado_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation" ON public.fiado_payments;
CREATE POLICY "Tenant isolation"
ON public.fiado_payments
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant_id())
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE INDEX IF NOT EXISTS idx_fiado_payments_tenant_id ON public.fiado_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fiado_payments_fiado_id ON public.fiado_payments(fiado_id);
CREATE INDEX IF NOT EXISTS idx_fiado_payments_paid_at ON public.fiado_payments(paid_at DESC);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.fiado_payments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;