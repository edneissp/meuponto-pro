import { supabase } from "@/integrations/supabase/client";

export const DEMO_SESSION_KEY = "youcontrol-demo-session";
export const DEMO_SESSION_DURATION_MS = 20 * 60 * 1000;

export interface DemoSessionData {
  startedAt: number;
  expiresAt: number;
}

const isBrowser = () => typeof window !== "undefined";

export const getDemoSession = (): DemoSessionData | null => {
  if (!isBrowser()) return null;

  const raw = window.localStorage.getItem(DEMO_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as DemoSessionData;
    if (typeof parsed.startedAt !== "number" || typeof parsed.expiresAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveDemoSession = (session: DemoSessionData) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
};

export const clearDemoSession = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(DEMO_SESSION_KEY);
};

export const startDemoSession = async () => {
  const { data, error } = await supabase.functions.invoke("demo-session", {
    body: { action: "start" },
  });

  if (error) throw error;
  if (!data?.access_token || !data?.refresh_token) {
    throw new Error("Não foi possível iniciar a demonstração agora.");
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });

  if (sessionError) throw sessionError;

  const startedAt = Date.now();
  saveDemoSession({
    startedAt,
    expiresAt: startedAt + DEMO_SESSION_DURATION_MS,
  });

  return data;
};
