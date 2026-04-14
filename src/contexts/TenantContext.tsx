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
  const loadingRef = useRef<string | null>(null); // tracks which uid completed successfully
  const loadingInProgress = useRef(false);

  const loadTenant = useCallback(async (uid: string) => {
    // Skip only if this uid already loaded successfully (tenantId is set)
    if (loadingRef.current === uid && !loading) return;

    // Prevent concurrent loads
    if (loadingInProgress.current) return;
    loadingInProgress.current = true;

    queryClient.clear();

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", uid)
        .single();

      if (error || !profile?.tenant_id) {
        console.error("Failed to load tenant for user", uid, error);
        loadingRef.current = null;
        setTenantId(null);
        setUserId(null);
        setLoading(false);
        return;
      }

      loadingRef.current = uid; // mark as successfully loaded
      setTenantId(profile.tenant_id);
      setUserId(uid);
      setLoading(false);
      setSessionKey((k) => k + 1);
    } catch (err) {
      console.error("Tenant load crash", err);
      loadingRef.current = null;
      setTenantId(null);
      setUserId(null);
      setLoading(false);
    } finally {
      loadingInProgress.current = false;
    }
  }, [loading]);

  const clearTenant = useCallback(() => {
    loadingRef.current = null;
    loadingInProgress.current = false;
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
      (event, session) => {
        if (!mounted) return;

        if (event === "INITIAL_SESSION") {
          initialSessionHandled = true;
          if (session?.user) {
            // Use setTimeout to avoid blocking auth listener
            setTimeout(() => { if (mounted) loadTenant(session.user.id); }, 0);
          } else {
            setLoading(false);
          }
        } else if (event === "SIGNED_IN" && session?.user) {
          if (session.user.id !== loadingRef.current) {
            loadingRef.current = null;
            loadingInProgress.current = false;
          }
          setTimeout(() => { if (mounted) loadTenant(session.user.id); }, 0);
        } else if (event === "SIGNED_OUT") {
          clearTenant();
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          if (!tenantId && session.user.id) {
            loadingRef.current = null;
            loadingInProgress.current = false;
            setTimeout(() => { if (mounted) loadTenant(session.user.id); }, 0);
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

    // Ultimate safety: force loading=false after 8s no matter what
    const ultimateTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn("[TenantContext] Ultimate safety timeout — forcing loading=false");
        setLoading(false);
      }
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      clearTimeout(ultimateTimer);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <TenantContext.Provider value={{ tenantId, userId, loading, sessionKey }}>
      {children}
    </TenantContext.Provider>
  );
};
