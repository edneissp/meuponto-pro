import { supabase } from "@/integrations/supabase/client";

type Severity = "info" | "warning" | "error" | "critical";

interface LogErrorParams {
  module: string;
  errorMessage: string;
  stackTrace?: string;
  severity?: Severity;
}

/**
 * Logs an error to the system_errors table.
 * Silently fails — never blocks the user flow.
 */
export const logSystemError = async ({ module, errorMessage, stackTrace, severity = "error" }: LogErrorParams) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user
      ? (await supabase.from("profiles").select("tenant_id").eq("user_id", session.user.id).single()).data?.tenant_id ?? null
      : null;

    await (supabase.from("system_errors") as any).insert({
      tenant_id: tenantId,
      module,
      error_message: errorMessage,
      stack_trace: stackTrace || null,
      severity,
    });
  } catch {
    // Silent fail
  }
};
