
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  business_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert leads (public form)
CREATE POLICY "Public can insert leads" ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view leads
CREATE POLICY "Admins can view leads" ON public.leads
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
