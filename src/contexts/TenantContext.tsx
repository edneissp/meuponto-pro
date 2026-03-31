import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/queryClient";

interface TenantContextType {
  tenantId: string | null;
  userId: string | null;
  loading: boolean;
  sessionKey: number; // changes on auth switch, forces child re-mount
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  userId: null,
  loading: true,
  sessionKey: 0,
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionKey, setSessionKey] = useState(0);

  const loadTenant = useCallback(async (uid: string) => {
    // Clear previous tenant's cached data before loading new tenant
    queryClient.clear();

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", uid)
      .single();

    setTenantId(profile?.tenant_id || null);
    setUserId(uid);
    setLoading(false);
    setSessionKey((k) => k + 1);
  }, []);

  const clearTenant = useCallback(() => {
    setTenantId(null);
    setUserId(null);
    setLoading(false);
    setSessionKey((k) => k + 1);
    // Clear all cached query data to prevent cross-tenant data leaks
    queryClient.clear();
    try {
      sessionStorage.clear();
    } catch {}
  }, []);

  useEffect(() => {
    // Set up listener FIRST, then check current session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          await loadTenant(session.user.id);
        } else if (event === "SIGNED_OUT") {
          clearTenant();
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Only reload if user changed
          if (session.user.id !== userId) {
            await loadTenant(session.user.id);
          }
        }
      }
    );

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadTenant(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <TenantContext.Provider value={{ tenantId, userId, loading, sessionKey }}>
      {children}
    </TenantContext.Provider>
  );
};
