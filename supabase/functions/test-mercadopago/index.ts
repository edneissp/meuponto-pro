const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured");
    }

    const body = await req.json().catch(() => ({}));
    const origin = typeof body.origin === "string" && body.origin ? body.origin : "https://meuponto-pro.lovable.app";

    const preference = {
      items: [
        {
          title: "Plano SouEFI",
          quantity: 1,
          unit_price: 39.9,
          currency_id: "BRL",
        },
      ],
      back_urls: {
        success: `${origin}/test-checkout?status=approved`,
        failure: `${origin}/test-checkout?status=rejected`,
        pending: `${origin}/test-checkout?status=pending`,
      },
      auto_return: "approved",
      external_reference: `test-checkout-${Date.now()}`,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/test-mercadopago-webhook`,
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    const responseText = await mpResponse.text();
    let mpData: any;
    try {
      mpData = JSON.parse(responseText);
    } catch {
      mpData = { raw: responseText };
    }

    if (!mpResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `Mercado Pago API error [${mpResponse.status}]`,
          details: mpData,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        status: "success",
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        preference_id: mpData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Test Mercado Pago checkout error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});