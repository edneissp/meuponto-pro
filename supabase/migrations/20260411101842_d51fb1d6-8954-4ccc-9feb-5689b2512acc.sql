
-- 1. Add soft delete columns to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- 2. Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL DEFAULT 'new_registration',
  title text NOT NULL,
  message text NOT NULL,
  reference_id uuid,
  status text NOT NULL DEFAULT 'unread',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view notifications
CREATE POLICY "Admins can view all notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update notifications (mark as read)
CREATE POLICY "Admins can update notifications"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete notifications
CREATE POLICY "Admins can delete notifications"
ON public.admin_notifications
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow inserts from triggers (service role / security definer)
CREATE POLICY "System can insert notifications"
ON public.admin_notifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Create trigger function to auto-generate notification on new tenant
CREATE OR REPLACE FUNCTION public.notify_admin_new_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, reference_id)
  VALUES (
    'new_registration',
    'Novo cadastro realizado',
    'Novo cadastro realizado: ' || NEW.name,
    NEW.id
  );
  RETURN NEW;
END;
$$;

-- 4. Create trigger on tenants table
CREATE TRIGGER on_new_tenant_notify_admin
AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_new_tenant();

-- 5. Enable realtime for admin_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
