import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./TenantContext";

export interface Store {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  is_default: boolean;
}

interface StoreContextType {
  stores: Store[];
  currentStoreId: string | null;
  currentStore: Store | null;
  setCurrentStoreId: (id: string | null) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType>({
  stores: [],
  currentStoreId: null,
  currentStore: null,
  setCurrentStoreId: () => {},
  loading: true,
  refresh: async () => {},
});

export const useStore = () => useContext(StoreContext);

const STORAGE_KEY = "current_store_id";

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const { tenantId, userId } = useTenant();
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStoreId, setCurrentStoreIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tenantId || !userId) {
      setStores([]);
      setCurrentStoreIdState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stores" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      const list = (data || []) as unknown as Store[];
      setStores(list);

      const saved = localStorage.getItem(STORAGE_KEY);
      const valid = saved && list.some((s) => s.id === saved) ? saved : list[0]?.id || null;
      setCurrentStoreIdState(valid);
      if (valid) localStorage.setItem(STORAGE_KEY, valid);
    } catch (err) {
      console.error("[StoreContext] load failed", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId]);

  useEffect(() => { load(); }, [load]);

  const setCurrentStoreId = (id: string) => {
    setCurrentStoreIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const currentStore = stores.find((s) => s.id === currentStoreId) || null;

  return (
    <StoreContext.Provider value={{ stores, currentStoreId, currentStore, setCurrentStoreId, loading, refresh: load }}>
      {children}
    </StoreContext.Provider>
  );
};
