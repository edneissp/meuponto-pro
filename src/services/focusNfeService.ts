/**
 * Focus NFe Integration Service (Frontend)
 * All calls go through edge functions; API keys NEVER touch the browser.
 */

import { supabase } from "@/integrations/supabase/client";

export interface EmitirNotaParams {
  type: "nfe" | "nfce";
  amount: number;
  sale_id?: string | null;
  customer_name?: string | null;
  customer_document?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  items?: Array<{
    codigo?: string;
    descricao: string;
    ncm?: string;
    cfop?: string;
    unidade?: string;
    quantidade: number;
    valor_unitario: number;
  }>;
}

export const focusNfeService = {
  async emitirNota(params: EmitirNotaParams) {
    const { data, error } = await supabase.functions.invoke("focus-nfe-emit", { body: params });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; documentId?: string; ref?: string; status?: string; error?: string };
  },

  async consultarNota(documentId: string) {
    const { data, error } = await supabase.functions.invoke("focus-nfe-consult", {
      body: { action: "consult", document_id: documentId },
    });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; status?: string; error?: string };
  },

  async cancelarNota(documentId: string, reason: string) {
    const { data, error } = await supabase.functions.invoke("focus-nfe-consult", {
      body: { action: "cancel", document_id: documentId, reason },
    });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; error?: string };
  },
};
