
-- Fix alerts
DROP POLICY IF EXISTS "Tenant isolation" ON public.alerts;
CREATE POLICY "Tenant isolation" ON public.alerts FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Fix categories
DROP POLICY IF EXISTS "Tenant isolation" ON public.categories;
CREATE POLICY "Tenant isolation" ON public.categories FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Fix customers (ensure permissive)
DROP POLICY IF EXISTS "Tenant isolation" ON public.customers;
CREATE POLICY "Tenant isolation" ON public.customers FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Fix expenses
DROP POLICY IF EXISTS "Tenant isolation" ON public.expenses;
CREATE POLICY "Tenant isolation" ON public.expenses FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Fix fiados
DROP POLICY IF EXISTS "Tenant isolation" ON public.fiados;
CREATE POLICY "Tenant isolation" ON public.fiados FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Fix products
DROP POLICY IF EXISTS "Tenant isolation" ON public.products;
CREATE POLICY "Tenant isolation" ON public.products FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Fix sale_items
DROP POLICY IF EXISTS "Tenant isolation" ON public.sale_items;
CREATE POLICY "Tenant isolation" ON public.sale_items FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Fix sales
DROP POLICY IF EXISTS "Tenant isolation" ON public.sales;
CREATE POLICY "Tenant isolation" ON public.sales FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Fix stock_movements
DROP POLICY IF EXISTS "Tenant isolation" ON public.stock_movements;
CREATE POLICY "Tenant isolation" ON public.stock_movements FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Fix suppliers
DROP POLICY IF EXISTS "Tenant isolation" ON public.suppliers;
CREATE POLICY "Tenant isolation" ON public.suppliers FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Fix payments
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Owners can view their payments" ON public.payments;
CREATE POLICY "Owners can view their payments" ON public.payments FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can manage all payments" ON public.payments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;
CREATE POLICY "Users can view profiles in their tenant" ON public.profiles FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Fix tenants
DROP POLICY IF EXISTS "Admins can update all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admins can view all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Owners can update their tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users can view their tenant" ON public.tenants;
CREATE POLICY "Users can view their tenant" ON public.tenants FOR SELECT TO authenticated
USING (id = get_user_tenant_id());
CREATE POLICY "Admins can view all tenants" ON public.tenants FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners can update their tenant" ON public.tenants FOR UPDATE TO authenticated
USING (id = get_user_tenant_id() AND has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "Admins can update all tenants" ON public.tenants FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix user_roles
DROP POLICY IF EXISTS "Owners can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in their tenant" ON public.user_roles;
CREATE POLICY "Users can view roles in their tenant" ON public.user_roles FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Owners can manage roles" ON public.user_roles FOR ALL TO authenticated
USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'owner'::app_role));
