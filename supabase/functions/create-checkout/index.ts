import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NORMAL_PRICE = 119.90;
const PROMO_PRICE = 69.90;
const PROMO_COUPON = "PRIMEIROS100";

const normalizeCoupon = (coupon: unknown) =>
  typeof coupon === "string" ? coupon.trim().toUpperCase().replace(/\s+/g, "") : "";

const addMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

type CouponReservation = {
  allowed: boolean;
  usage_count: number;
  max_uses: number;
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
    const body = await req.json().catch(() => ({}));
    const requestedUserId = typeof body.user_id === "string" ? body.user_id : null;
    const requestedTenantId = typeof body.tenant_id === "string" ? body.tenant_id : null;
    const coupon = normalizeCoupon(body.coupon);

    if (requestedUserId && requestedUserId !== userId) {
      return new Response(JSON.stringify({ error: "Invalid user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tenant info
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .single();

    if (!profile) {
      throw new Error("Profile not found");
    }

    if (requestedTenantId && requestedTenantId !== profile.tenant_id) {
      return new Response(JSON.stringify({ error: "Invalid tenant_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("id", profile.tenant_id)
      .single();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let amount = NORMAL_PRICE;
    let planType = "normal";
    let couponUsed: string | null = null;
    let promoExpiresAt: string | null = null;

    if (coupon) {
      if (coupon !== PROMO_COUPON) {
        return new Response(JSON.stringify({ error: "Cupom inválido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: reservation, error: reserveError } = await serviceClient
        .rpc("reserve_coupon_usage", { _code: PROMO_COUPON })
        .single<CouponReservation>();

      if (reserveError || !reservation?.allowed) {
        return new Response(JSON.stringify({ error: "Cupom esgotado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      amount = PROMO_PRICE;
      planType = "promo";
      couponUsed = "Primeiros100";
      promoExpiresAt = addMonths(new Date(), 12).toISOString();
    }

    const { origin } = body;
    const baseUrl = origin || "https://meuponto-pro.lovable.app";

    // Create Mercado Pago preference
    const preference = {
      items: [
        {
          title: `MeuPonto Pro - Assinatura Mensal (${tenant.name})`,
          quantity: 1,
          unit_price: amount,
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
      metadata: {
        tenant_id: tenant.id,
        user_id: userId,
        plan_type: planType,
        coupon_used: couponUsed,
      },
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

    await serviceClient.from("payments").insert({
      tenant_id: tenant.id,
      amount,
      plan_type: planType,
      coupon_used: couponUsed,
      promo_expires_at: promoExpiresAt,
      status: "pending",
      mercado_pago_preference_id: mpData.id,
    });

    return new Response(
      JSON.stringify({
        checkout_url: mpData.init_point,
        init_point: mpData.init_point,
        preference_id: mpData.id,
        amount,
        plan_type: planType,
        coupon_used: couponUsed,
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
