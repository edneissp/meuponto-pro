import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Get tenant info
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("id", profile.tenant_id)
      .single();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const { origin } = await req.json().catch(() => ({ origin: "" }));
    const baseUrl = origin || "https://meuponto-pro.lovable.app";

    // Create Mercado Pago preference
    const preference = {
      items: [
        {
          title: `MeuPonto Pro - Assinatura Mensal (${tenant.name})`,
          quantity: 1,
          unit_price: 39.90,
          currency_id: "BRL",
        },
      ],
      back_urls: {
        success: `${baseUrl}/app/payment-status?status=approved`,
        failure: `${baseUrl}/app/payment-status?status=rejected`,
        pending: `${baseUrl}/app/payment-status?status=pending`,
      },
      auto_return: "approved",
      external_reference: tenant.id,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpResponse.ok) {
      const errBody = await mpResponse.text();
      throw new Error(`Mercado Pago API error [${mpResponse.status}]: ${errBody}`);
    }

    const mpData = await mpResponse.json();

    // Create payment record
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await serviceClient.from("payments").insert({
      tenant_id: tenant.id,
      amount: 100,
      status: "pending",
      mercado_pago_preference_id: mpData.id,
    });

    return new Response(
      JSON.stringify({
        checkout_url: mpData.init_point,
        preference_id: mpData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating checkout:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
