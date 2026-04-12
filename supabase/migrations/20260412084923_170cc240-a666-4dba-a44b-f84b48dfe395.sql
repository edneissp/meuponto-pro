
CREATE TABLE public.system_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  module TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  severity TEXT NOT NULL DEFAULT 'error',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all errors"
  ON public.system_errors FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert errors"
  ON public.system_errors FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() OR tenant_id IS NULL);

CREATE INDEX idx_system_errors_tenant ON public.system_errors(tenant_id);
CREATE INDEX idx_system_errors_severity ON public.system_errors(severity);
CREATE INDEX idx_system_errors_created ON public.system_errors(created_at DESC);
