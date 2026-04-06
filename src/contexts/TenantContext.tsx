import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/queryClient";

interface TenantContextType {
  tenantId: string | null;
  userId: string | null;
  loading: boolean;
  sessionKey: number;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  userId: null,
  loading: true,
  sessionKey: 0,
});

export const useTenant = () => useContext(TenantContext);

/** Aggressively wipe all browser storage to prevent stale data */
const purgeAllStorage = () => {
  try { localStorage.clear(); } catch {}
  try { sessionStorage.clear(); } catch {}
  // Clear any domain cookies accessible from JS
  try {
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  } catch {}
};

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionKey, setSessionKey] = useState(0);

  const loadTenant = useCallback(async (uid: string) => {
    queryClient.clear();

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", uid)
        .single();

      if (error || !profile?.tenant_id) {
        console.error("Failed to load tenant for user", uid, error);
        // Profile missing — force clean logout
        purgeAllStorage();
        setTenantId(null);
        setUserId(null);
        setLoading(false);
        return;
      }

      setTenantId(profile.tenant_id);
      setUserId(uid);
      setLoading(false);
      setSessionKey((k) => k + 1);
    } catch (err) {
      console.error("Tenant load crash", err);
      purgeAllStorage();
      setTenantId(null);
      setUserId(null);
      setLoading(false);
    }
  }, []);

  const clearTenant = useCallback(() => {
    setTenantId(null);
    setUserId(null);
    setLoading(false);
    setSessionKey((k) => k + 1);
    queryClient.clear();
    purgeAllStorage();
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && session?.user) {
          await loadTenant(session.user.id);
        } else if (event === "SIGNED_OUT") {
          clearTenant();
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          if (session.user.id !== userId) {
            await loadTenant(session.user.id);
          }
        }
      }
    );

    // Check current session — handle stale/corrupt tokens
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        console.warn("Corrupt session detected, purging storage", error);
        purgeAllStorage();
        setLoading(false);
        return;
      }

      if (session?.user) {
        loadTenant(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <TenantContext.Provider value={{ tenantId, userId, loading, sessionKey }}>
      {children}
    </TenantContext.Provider>
  );
};
