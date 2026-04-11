import { supabase } from "@/integrations/supabase/client";

type AuditAction = "login" | "logout" | "create" | "update" | "delete" | "payment" | "fiado";

interface AuditLogParams {
  action: AuditAction;
  module: string;
  referenceId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

/**
 * Logs an action to the audit_logs table.
 * Silently fails — never blocks the user flow.
 */
export const logAudit = async ({ action, module, referenceId, oldData, newData }: AuditLogParams) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", session.user.id)
      .single();

    if (!profile?.tenant_id) return;

    await supabase.from("audit_logs" as any).insert({
      tenant_id: profile.tenant_id,
      user_id: session.user.id,
      action,
      module,
      reference_id: referenceId || null,
      old_data: oldData || {},
      new_data: newData || {},
    });
  } catch {
    // Silent fail — audit should never block user operations
  }
};
