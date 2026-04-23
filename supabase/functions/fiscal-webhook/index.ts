import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const tenantIdFromPath = pathParts.length >= 2 ? pathParts[pathParts.length - 1] : null;

    const body = await req.json().catch(() => ({}));

    // Test connection action
    if (body.action === "test_connection") {
      const tenantId = body.tenant_id;
      if (!tenantId) {
        return new Response(JSON.stringify({ success: false, error: "tenant_id obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: config } = await supabase
        .from("fiscal_api_config").select("*").eq("tenant_id", tenantId).maybeSingle();
      if (!config?.api_key_encrypted) {
        return new Response(JSON.stringify({ success: false, error: "API Key não configurada" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const baseUrl = config.environment === "producao"
        ? "https://api.focusnfe.com.br"
        : "https://homologacao.focusnfe.com.br";
      try {
        const resp = await fetch(`${baseUrl}/v2/nfce?ref=test_${Date.now()}`, {
          headers: { "Authorization": `Basic ${btoa(config.api_key_encrypted + ":")}` },
        });
        const ok = resp.status !== 401 && resp.status !== 403;
        return new Response(JSON.stringify({
          success: ok,
          error: ok ? "" : "API Key inválida ou sem permissão",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: `Erro de rede: ${e.message}` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Webhook callback from Focus NFe: /fiscal-webhook/{tenant_id}
    if (tenantIdFromPath) {
      const { data: config } = await supabase
        .from("fiscal_api_config").select("environment").eq("tenant_id", tenantIdFromPath).maybeSingle();
      if (!config) {
        return new Response(JSON.stringify({ error: "Tenant não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const baseUrl = config.environment === "producao"
        ? "https://api.focusnfe.com.br"
        : "https://homologacao.focusnfe.com.br";

      const ref = body.ref || body.referencia || body.id;
      const status = body.status || body.situacao;

      if (ref) {
        const statusMap: Record<string, string> = {
          autorizado: "issued", autorizada: "issued",
          cancelado: "canceled", cancelada: "canceled",
          rejeitado: "error", rejeitada: "error",
          denegado: "error", denegada: "error",
          erro_autorizacao: "error", erro: "error",
          processando_autorizacao: "processing",
        };
        const mappedStatus = statusMap[String(status || "").toLowerCase()] || status || "processing";

        const pdfPath = body.caminho_danfe || body.pdf_url || null;
        const xmlPath = body.caminho_xml_nota_fiscal || body.caminho_xml || body.xml_url || null;

        await supabase.from("fiscal_documents").update({
          status: mappedStatus,
          number: body.numero || body.number || null,
          pdf_url: pdfPath ? (pdfPath.startsWith("http") ? pdfPath : `${baseUrl}${pdfPath}`) : null,
          xml_url: xmlPath ? (xmlPath.startsWith("http") ? xmlPath : `${baseUrl}${xmlPath}`) : null,
          error_message: body.mensagem_sefaz || body.error_message || null,
        }).eq("tenant_id", tenantIdFromPath).eq("api_reference", ref);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Rota não encontrada" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
