/**
 * Fiscal Service Layer
 * Prepared for future external API integration (e.g., Focus NFe, Enotas, Webmania).
 * All methods are stubs that create local records and return pending status.
 * When an API key is configured, these methods will call the external API.
 */

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
  /**
   * Emit a fiscal document (NF-e or NFC-e).
   * Currently creates a pending record. Will call external API when configured.
   */
  async emitInvoice(params: FiscalEmitParams): Promise<{ success: boolean; documentId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("fiscal_documents" as any)
        .insert({
          tenant_id: params.tenantId,
          sale_id: params.saleId || null,
          type: params.type,
          customer_name: params.customerName || null,
          customer_document: params.customerDocument || null,
          customer_email: params.customerEmail || null,
          customer_address: params.customerAddress || null,
          amount: params.amount,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) return { success: false, error: error.message };

      // TODO: When API key is configured, call external fiscal API here
      // const apiResult = await callExternalFiscalApi(data.id, params);
      // await updateDocumentWithApiResult(data.id, apiResult);

      return { success: true, documentId: (data as any).id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Cancel an issued fiscal document.
   */
  async cancelInvoice(documentId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("fiscal_documents" as any)
        .update({ status: "canceled", cancel_reason: reason } as any)
        .eq("id", documentId);

      if (error) return { success: false, error: error.message };

      // TODO: Call external API to cancel the document
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Consult a fiscal document status.
   */
  async consultInvoice(documentId: string): Promise<FiscalDocument | null> {
    const { data, error } = await supabase
      .from("fiscal_documents" as any)
      .select("*")
      .eq("id", documentId)
      .single();

    if (error) return null;
    // TODO: If API key configured, refresh status from external API
    return data as any;
  },

  /**
   * Download DANFE PDF.
   */
  async downloadDanfe(documentId: string): Promise<string | null> {
    const { data } = await supabase
      .from("fiscal_documents" as any)
      .select("pdf_url")
      .eq("id", documentId)
      .single();

    return (data as any)?.pdf_url || null;
  },

  /**
   * Download XML.
   */
  async downloadXml(documentId: string): Promise<string | null> {
    const { data } = await supabase
      .from("fiscal_documents" as any)
      .select("xml_url")
      .eq("id", documentId)
      .single();

    return (data as any)?.xml_url || null;
  },
};
