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

/**
 * Start demo mode by saving session locally and redirecting.
 * No Edge Functions or external API calls.
 */
export const startDemoSession = () => {
  const startedAt = Date.now();
  saveDemoSession({
    startedAt,
    expiresAt: startedAt + DEMO_SESSION_DURATION_MS,
  });
};
