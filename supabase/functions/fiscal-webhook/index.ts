import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    // Check if this is a webhook callback: /fiscal-webhook/{tenant_id}
    const tenantIdFromPath = pathParts.length >= 2 ? pathParts[pathParts.length - 1] : null;

    const body = await req.json().catch(() => ({}));

    // If action is test_connection, validate the API config
    if (body.action === "test_connection") {
      const tenantId = body.tenant_id;
      if (!tenantId) {
        return new Response(JSON.stringify({ success: false, error: "tenant_id obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: config, error: configError } = await supabase
        .from("fiscal_api_config")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (configError || !config) {
        return new Response(JSON.stringify({ success: false, error: "Configuração não encontrada" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!config.api_key_encrypted) {
        return new Response(JSON.stringify({ success: false, error: "API Key não configurada" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Attempt real API validation based on provider
      let testResult = { success: false, error: "Provedor não suportado" };

      if (config.provider === "focus_nfe") {
        const baseUrl = config.environment === "producao"
          ? "https://api.focusnfe.com.br/v2"
          : "https://homologacao.focusnfe.com.br/v2";

        try {
          const resp = await fetch(`${baseUrl}/nfce?ref=test_conn_${Date.now()}`, {
            method: "GET",
            headers: {
              "Authorization": `Basic ${btoa(config.api_key_encrypted + ":")}`,
            },
          });
          // 401 = bad key, 404/200 = key is valid (ref not found is ok)
          if (resp.status === 401 || resp.status === 403) {
            testResult = { success: false, error: "API Key inválida ou sem permissão" };
          } else {
            testResult = { success: true, error: "" };
          }
        } catch (e: any) {
          testResult = { success: false, error: `Erro de rede: ${e.message}` };
        }
      } else if (config.provider === "nuvem_fiscal") {
        const baseUrl = config.environment === "producao"
          ? "https://api.nuvemfiscal.com.br"
          : "https://api.sandbox.nuvemfiscal.com.br";

        try {
          const resp = await fetch(`${baseUrl}/nfce`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${config.api_key_encrypted}`,
            },
          });
          if (resp.status === 401 || resp.status === 403) {
            testResult = { success: false, error: "API Key inválida ou sem permissão" };
          } else {
            testResult = { success: true, error: "" };
          }
        } catch (e: any) {
          testResult = { success: false, error: `Erro de rede: ${e.message}` };
        }
      }

      return new Response(JSON.stringify(testResult), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Webhook callback from fiscal provider
    if (tenantIdFromPath) {
      const { data: config } = await supabase
        .from("fiscal_api_config")
        .select("id")
        .eq("tenant_id", tenantIdFromPath)
        .maybeSingle();

      if (!config) {
        return new Response(JSON.stringify({ error: "Tenant não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Process webhook: update fiscal_documents based on provider callback
      const ref = body.ref || body.referencia || body.id;
      const status = body.status || body.situacao;

      if (ref && status) {
        const statusMap: Record<string, string> = {
          autorizado: "issued",
          autorizada: "issued",
          cancelado: "canceled",
          cancelada: "canceled",
          rejeitado: "error",
          rejeitada: "error",
          erro: "error",
        };

        const mappedStatus = statusMap[String(status).toLowerCase()] || status;

        await supabase
          .from("fiscal_documents")
          .update({
            status: mappedStatus,
            api_reference: ref,
            number: body.numero || body.number || null,
            pdf_url: body.caminho_danfe || body.pdf_url || null,
            xml_url: body.caminho_xml || body.xml_url || null,
            error_message: body.mensagem_sefaz || body.error_message || null,
          })
          .eq("tenant_id", tenantIdFromPath)
          .eq("api_reference", ref);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Rota não encontrada" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
