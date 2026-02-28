
-- Create policy for admin to read all tenants
CREATE POLICY "Admins can view all tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for admin to update all tenants
CREATE POLICY "Admins can update all tenants"
ON public.tenants
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can also read all profiles for tenant management
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
