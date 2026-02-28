
-- Drop the old unique constraint and create one that allows multiple roles per user per tenant
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_tenant_id_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_tenant_id_key UNIQUE (user_id, tenant_id, role);
