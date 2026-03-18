import { useEffect, useMemo, useState } from "react";
import { clearDemoSession, getDemoSession } from "@/lib/demo";

export const useDemoSession = (enabled: boolean) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [enabled]);

  const session = useMemo(() => (enabled ? getDemoSession() : null), [enabled, now]);
  const remainingMs = session ? Math.max(0, session.expiresAt - now) : 0;

  return {
    isDemo: enabled && !!session,
    isExpired: enabled && !!session && remainingMs <= 0,
    remainingMs,
    remainingMinutes: Math.max(0, Math.ceil(remainingMs / 60000)),
    clearSession: clearDemoSession,
  };
};
