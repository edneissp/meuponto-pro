-- 1. Tabela stores
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_stores_tenant ON public.stores(tenant_id) WHERE deleted_at IS NULL;

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can view own stores"
  ON public.stores FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Owners can manage stores"
  ON public.stores FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Admins can manage all stores"
  ON public.stores FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Tabela user_stores
CREATE TABLE public.user_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, store_id)
);

CREATE INDEX idx_user_stores_user ON public.user_stores(user_id);
CREATE INDEX idx_user_stores_store ON public.user_stores(store_id);

ALTER TABLE public.user_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their store memberships"
  ON public.user_stores FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR tenant_id = get_user_tenant_id());

CREATE POLICY "Owners can manage user stores"
  ON public.user_stores FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Admins can manage all user stores"
  ON public.user_stores FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Helper para obter store atual (usaremos via header/contexto futuramente)
CREATE OR REPLACE FUNCTION public.user_has_store_access(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_stores WHERE user_id = _user_id AND store_id = _store_id
  )
$$;

-- 4. Backfill: cria Loja Principal para cada tenant existente
INSERT INTO public.stores (tenant_id, name, is_default)
SELECT t.id, 'Loja Principal', true
FROM public.tenants t
WHERE t.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.tenant_id = t.id);

-- 5. Backfill: dá acesso a todos os usuários existentes às lojas do seu tenant
INSERT INTO public.user_stores (user_id, store_id, tenant_id, role)
SELECT p.user_id, s.id, p.tenant_id, COALESCE(ur.role::text, 'cashier')
FROM public.profiles p
JOIN public.stores s ON s.tenant_id = p.tenant_id AND s.is_default = true
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.tenant_id = p.tenant_id
ON CONFLICT (user_id, store_id) DO NOTHING;

-- 6. Atualiza handle_new_user para criar Loja Principal + user_store no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  new_tenant_id UUID;
  new_store_id UUID;
  generated_slug TEXT;
BEGIN
  generated_slug := 't-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

  INSERT INTO public.tenants (
    name, public_slug, trial_start, trial_end, plano, ativo, subscription_status, origin
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'Meu Estabelecimento'),
    generated_slug,
    CURRENT_DATE,
    CURRENT_DATE + interval '30 days',
    'trial', true, 'trial',
    COALESCE(NEW.raw_user_meta_data->>'origin', 'direct')
  )
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.profiles (user_id, tenant_id, full_name)
  VALUES (NEW.id, new_tenant_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'owner');

  INSERT INTO public.stores (tenant_id, name, is_default)
  VALUES (new_tenant_id, 'Loja Principal', true)
  RETURNING id INTO new_store_id;

  INSERT INTO public.user_stores (user_id, store_id, tenant_id, role)
  VALUES (NEW.id, new_store_id, new_tenant_id, 'owner');

  RETURN NEW;
END;
$function$;