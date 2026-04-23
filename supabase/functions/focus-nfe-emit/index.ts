import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface EmitPayload {
  type: "nfe" | "nfce";
  sale_id?: string | null;
  customer_name?: string | null;
  customer_document?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  amount: number;
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

function digits(s: string | null | undefined) {
  return (s || "").replace(/\D/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve user → tenant
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
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

    const body = (await req.json().catch(() => ({}))) as EmitPayload;
    if (!body.type || !body.amount || body.amount <= 0) {
      return new Response(JSON.stringify({ success: false, error: "Dados inválidos (type/amount)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load API config + fiscal settings
    const [{ data: config }, { data: settings }] = await Promise.all([
      supabase.from("fiscal_api_config").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("fiscal_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    ]);

    if (!config?.api_key_encrypted) {
      return new Response(JSON.stringify({ success: false, error: "Configure a API Key fiscal antes de emitir." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!settings?.cnpj || !settings?.razao_social) {
      return new Response(JSON.stringify({ success: false, error: "Preencha as configurações fiscais (CNPJ, Razão Social, endereço)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ref = `${tenantId.slice(0, 8)}-${(body.sale_id || "manual").slice(0, 8)}-${Date.now()}`;

    // Create pending fiscal_documents record
    const { data: doc, error: docErr } = await supabase
      .from("fiscal_documents").insert({
        tenant_id: tenantId,
        sale_id: body.sale_id || null,
        type: body.type,
        customer_name: body.customer_name || null,
        customer_document: body.customer_document || null,
        customer_email: body.customer_email || null,
        customer_address: body.customer_address || null,
        amount: body.amount,
        status: "pending",
        api_reference: ref,
      }).select("id").single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ success: false, error: docErr?.message || "Falha ao registrar documento" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build payload for Focus NFe
    const baseUrl = config.environment === "producao"
      ? "https://api.focusnfe.com.br"
      : "https://homologacao.focusnfe.com.br";

    const endpoint = body.type === "nfce" ? "nfce" : "nfe";

    // Default item if none provided
    const items = (body.items && body.items.length > 0) ? body.items : [{
      codigo: "001",
      descricao: "Venda balcão",
      ncm: "00000000",
      cfop: "5102",
      unidade: "UN",
      quantidade: 1,
      valor_unitario: body.amount,
    }];

    const regimeMap: Record<string, string> = {
      simples_nacional: "1",
      simples_nacional_excesso: "2",
      lucro_presumido: "3",
      lucro_real: "3",
      mei: "1",
    };

    const focusPayload: any = {
      natureza_operacao: "Venda de mercadoria",
      data_emissao: new Date().toISOString(),
      tipo_documento: "1",
      finalidade_emissao: "1",
      presenca_comprador: body.type === "nfce" ? "1" : "9",
      cnpj_emitente: digits(settings.cnpj),
      nome_emitente: settings.razao_social,
      nome_fantasia_emitente: settings.nome_fantasia || settings.razao_social,
      logradouro_emitente: settings.endereco || "",
      numero_emitente: "S/N",
      bairro_emitente: "Centro",
      municipio_emitente: settings.cidade || "",
      uf_emitente: (settings.estado || "").toUpperCase(),
      cep_emitente: digits(settings.cep),
      inscricao_estadual_emitente: settings.inscricao_estadual || "",
      regime_tributario_emitente: regimeMap[settings.regime_tributario || "simples_nacional"] || "1",
      modalidade_frete: "9",
      items: items.map((it, idx) => ({
        numero_item: idx + 1,
        codigo_produto: it.codigo || `P${idx + 1}`,
        descricao: it.descricao,
        cfop: it.cfop || "5102",
        unidade_comercial: it.unidade || "UN",
        quantidade_comercial: it.quantidade,
        valor_unitario_comercial: it.valor_unitario,
        valor_unitario_tributavel: it.valor_unitario,
        unidade_tributavel: it.unidade || "UN",
        codigo_ncm: it.ncm || "00000000",
        quantidade_tributavel: it.quantidade,
        origem: "0",
        icms_situacao_tributaria: "102", // Simples - sem permissão de crédito
      })),
    };

    // Optional destinatario
    if (body.customer_document) {
      const docDigits = digits(body.customer_document);
      if (docDigits.length === 14) {
        focusPayload.cnpj_destinatario = docDigits;
      } else if (docDigits.length === 11) {
        focusPayload.cpf_destinatario = docDigits;
      }
      focusPayload.nome_destinatario = body.customer_name || "Consumidor";
      focusPayload.indicador_inscricao_estadual_destinatario = "9";
      if (body.customer_email) focusPayload.email_destinatario = body.customer_email;
    }

    // Call Focus NFe
    const focusUrl = `${baseUrl}/v2/${endpoint}?ref=${encodeURIComponent(ref)}`;
    let focusResp: Response;
    let focusData: any;
    try {
      focusResp = await fetch(focusUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(config.api_key_encrypted + ":")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(focusPayload),
      });
      const text = await focusResp.text();
      try { focusData = JSON.parse(text); } catch { focusData = { raw: text }; }
    } catch (e: any) {
      await supabase.from("fiscal_documents").update({
        status: "error", error_message: `Erro de rede: ${e.message}`,
      }).eq("id", doc.id);
      return new Response(JSON.stringify({ success: false, error: `Erro de rede com Focus NFe: ${e.message}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map response status
    const focusStatus = focusData?.status || focusData?.status_sefaz;
    let mappedStatus = "processing";
    let errorMessage: string | null = null;

    if (focusResp.status >= 400) {
      mappedStatus = "error";
      errorMessage = focusData?.mensagem || focusData?.erros?.[0]?.mensagem || focusData?.message || `HTTP ${focusResp.status}`;
    } else if (focusStatus === "autorizado") {
      mappedStatus = "issued";
    } else if (focusStatus === "processando_autorizacao" || focusStatus === "em_processamento") {
      mappedStatus = "processing";
    } else if (focusStatus === "erro_autorizacao" || focusStatus === "denegado") {
      mappedStatus = "error";
      errorMessage = focusData?.mensagem_sefaz || focusData?.mensagem || "Rejeitado pela SEFAZ";
    }

    await supabase.from("fiscal_documents").update({
      status: mappedStatus,
      number: focusData?.numero || null,
      pdf_url: focusData?.caminho_danfe ? `${baseUrl}${focusData.caminho_danfe}` : null,
      xml_url: focusData?.caminho_xml_nota_fiscal ? `${baseUrl}${focusData.caminho_xml_nota_fiscal}` : null,
      error_message: errorMessage,
    }).eq("id", doc.id);

    return new Response(JSON.stringify({
      success: mappedStatus !== "error",
      documentId: doc.id,
      ref,
      status: mappedStatus,
      error: errorMessage,
      focus: focusData,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
