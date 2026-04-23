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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await supabase
      .from("profiles").select("tenant_id").eq("user_id", user.id).maybeSingle();
    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ success: false, error: "Perfil sem tenant" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tenantId = profile.tenant_id;

    const body = await req.json().catch(() => ({}));
    const { action, document_id, reason } = body as { action: "consult" | "cancel"; document_id: string; reason?: string };

    if (!document_id) {
      return new Response(JSON.stringify({ success: false, error: "document_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: doc } = await supabase
      .from("fiscal_documents").select("*").eq("id", document_id).eq("tenant_id", tenantId).maybeSingle();
    if (!doc) {
      return new Response(JSON.stringify({ success: false, error: "Documento não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config } = await supabase
      .from("fiscal_api_config").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (!config?.api_key_encrypted) {
      return new Response(JSON.stringify({ success: false, error: "API Key não configurada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = config.environment === "producao"
      ? "https://api.focusnfe.com.br"
      : "https://homologacao.focusnfe.com.br";
    const endpoint = doc.type === "nfce" ? "nfce" : "nfe";
    const ref = doc.api_reference;

    if (!ref) {
      return new Response(JSON.stringify({ success: false, error: "Documento sem referência da API" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authBasic = `Basic ${btoa(config.api_key_encrypted + ":")}`;

    if (action === "cancel") {
      if (!reason || reason.length < 15) {
        return new Response(JSON.stringify({ success: false, error: "Justificativa precisa ter ao menos 15 caracteres" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const cancelResp = await fetch(`${baseUrl}/v2/${endpoint}/${encodeURIComponent(ref)}`, {
        method: "DELETE",
        headers: { "Authorization": authBasic, "Content-Type": "application/json" },
        body: JSON.stringify({ justificativa: reason }),
      });
      const text = await cancelResp.text();
      let data: any; try { data = JSON.parse(text); } catch { data = { raw: text }; }

      if (cancelResp.status >= 400) {
        return new Response(JSON.stringify({ success: false, error: data?.mensagem || data?.message || `HTTP ${cancelResp.status}` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("fiscal_documents").update({
        status: "canceled", cancel_reason: reason,
      }).eq("id", document_id);
      return new Response(JSON.stringify({ success: true, focus: data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consult
    const resp = await fetch(`${baseUrl}/v2/${endpoint}/${encodeURIComponent(ref)}`, {
      method: "GET",
      headers: { "Authorization": authBasic },
    });
    const text = await resp.text();
    let data: any; try { data = JSON.parse(text); } catch { data = { raw: text }; }

    const focusStatus = data?.status;
    const statusMap: Record<string, string> = {
      autorizado: "issued",
      cancelado: "canceled",
      denegado: "error",
      erro_autorizacao: "error",
      processando_autorizacao: "processing",
    };
    const mapped = statusMap[focusStatus] || doc.status;

    await supabase.from("fiscal_documents").update({
      status: mapped,
      number: data?.numero || doc.number,
      pdf_url: data?.caminho_danfe ? `${baseUrl}${data.caminho_danfe}` : doc.pdf_url,
      xml_url: data?.caminho_xml_nota_fiscal ? `${baseUrl}${data.caminho_xml_nota_fiscal}` : doc.xml_url,
      error_message: data?.mensagem_sefaz || data?.mensagem || null,
    }).eq("id", document_id);

    return new Response(JSON.stringify({ success: true, status: mapped, focus: data }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
