import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
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

/** Full storage wipe — only used on explicit logout or SIGNED_OUT */
const purgeAllStorage = () => {
  try { localStorage.clear(); } catch {}
  try { sessionStorage.clear(); } catch {}
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
  const loadingRef = useRef<string | null>(null); // tracks which uid is being loaded

  const loadTenant = useCallback(async (uid: string) => {
    // Deduplicate: skip if already loaded or loading for this uid
    if (loadingRef.current === uid) return;
    loadingRef.current = uid;

    queryClient.clear();

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", uid)
        .single();

      if (error || !profile?.tenant_id) {
        console.error("Failed to load tenant for user", uid, error);
        // Don't wipe auth tokens here — just reset tenant state
        loadingRef.current = null;
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
      // Don't wipe auth tokens on transient errors
      loadingRef.current = null;
      setTenantId(null);
      setUserId(null);
      setLoading(false);
    }
  }, []);

  const clearTenant = useCallback(() => {
    loadingRef.current = null;
    setTenantId(null);
    setUserId(null);
    setLoading(false);
    setSessionKey((k) => k + 1);
    queryClient.clear();
    purgeAllStorage();
  }, []);

  useEffect(() => {
    let mounted = true;
    let initialSessionHandled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "INITIAL_SESSION") {
          initialSessionHandled = true;
          if (session?.user) {
            await loadTenant(session.user.id);
          } else {
            setLoading(false);
          }
        } else if (event === "SIGNED_IN" && session?.user) {
          await loadTenant(session.user.id);
        } else if (event === "SIGNED_OUT") {
          clearTenant();
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Only reload if user actually changed (shouldn't normally happen)
          if (session.user.id !== userId) {
            loadingRef.current = null; // force reload
            await loadTenant(session.user.id);
          }
        }
      }
    );

    // Fallback: if INITIAL_SESSION doesn't fire within 2s, check manually
    const fallbackTimer = setTimeout(() => {
      if (!mounted || initialSessionHandled) return;
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (!mounted || initialSessionHandled) return;
        if (error) {
          console.warn("Corrupt session detected", error);
          setLoading(false);
          return;
        }
        if (session?.user) {
          loadTenant(session.user.id);
        } else {
          setLoading(false);
        }
      });
    }, 2000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <TenantContext.Provider value={{ tenantId, userId, loading, sessionKey }}>
      {children}
    </TenantContext.Provider>
  );
};
