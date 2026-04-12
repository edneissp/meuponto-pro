import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Validates the active session every 5 minutes.
 * Forces re-login if the token is invalid.
 */
export const useSessionHeartbeat = () => {
  const { userId } = useTenant();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const check = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          // Token invalid — force logout and redirect
          try { await supabase.auth.signOut(); } catch {}
          try { localStorage.clear(); } catch {}
          try { sessionStorage.clear(); } catch {}
          window.location.href = "/login";
        }
      } catch {
        // Network error — skip this cycle
      }
    };

    intervalRef.current = setInterval(check, HEARTBEAT_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userId]);
};
