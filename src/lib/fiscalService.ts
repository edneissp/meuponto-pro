/**
 * Fiscal Service Layer
 * Routes all calls through Focus NFe edge functions.
 * API keys are NEVER exposed to the frontend.
 */

import { focusNfeService, type EmitirNotaParams } from "@/services/focusNfeService";
import { supabase } from "@/integrations/supabase/client";

export interface FiscalEmitParams {
  tenantId: string;
  saleId?: string;
  type: "nfe" | "nfce";
  customerName?: string;
  customerDocument?: string;
  customerEmail?: string;
  customerAddress?: string;
  amount: number;
  items?: EmitirNotaParams["items"];
}

export interface FiscalDocument {
  id: string;
  tenant_id: string;
  sale_id: string | null;
  type: string;
  number: string | null;
  series: string | null;
  customer_name: string | null;
  customer_document: string | null;
  customer_email: string | null;
  customer_address: string | null;
  amount: number;
  status: string;
  api_reference: string | null;
  xml_url: string | null;
  pdf_url: string | null;
  cancel_reason: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export const fiscalService = {
  async emitInvoice(params: FiscalEmitParams) {
    return focusNfeService.emitirNota({
      type: params.type,
      amount: params.amount,
      sale_id: params.saleId || null,
      customer_name: params.customerName || null,
      customer_document: params.customerDocument || null,
      customer_email: params.customerEmail || null,
      customer_address: params.customerAddress || null,
      items: params.items,
    });
  },

  async cancelInvoice(documentId: string, reason: string) {
    return focusNfeService.cancelarNota(documentId, reason);
  },

  async consultInvoice(documentId: string) {
    return focusNfeService.consultarNota(documentId);
  },

  async downloadDanfe(documentId: string): Promise<string | null> {
    const { data } = await supabase
      .from("fiscal_documents" as any)
      .select("pdf_url").eq("id", documentId).single();
    return (data as any)?.pdf_url || null;
  },

  async downloadXml(documentId: string): Promise<string | null> {
    const { data } = await supabase
      .from("fiscal_documents" as any)
      .select("xml_url").eq("id", documentId).single();
    return (data as any)?.xml_url || null;
  },
};
