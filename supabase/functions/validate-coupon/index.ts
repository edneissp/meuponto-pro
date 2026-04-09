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

    const body = await req.json();
    const code = (body.code || "").toUpperCase().trim();

    if (!code || code.length < 2 || code.length > 50) {
      return new Response(JSON.stringify({ valid: false, error: "Código inválido" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS for full validation
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up the coupon
    const { data: coupon, error: couponError } = await serviceClient
      .from("discount_coupons")
      .select("*, discount_campaigns(*)")
      .eq("code", code)
      .single();

    if (couponError || !coupon) {
      return new Response(JSON.stringify({ valid: false, error: "Cupom não encontrado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check coupon status
    if (coupon.status !== "active") {
      return new Response(JSON.stringify({ valid: false, error: "Cupom expirado ou inativo" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check usage limit
    if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
      return new Response(JSON.stringify({ valid: false, error: "Cupom esgotado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiration
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: "Cupom expirado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check campaign limits if linked
    const campaign = coupon.discount_campaigns;
    if (campaign) {
      if (campaign.status !== "active") {
        return new Response(JSON.stringify({ valid: false, error: "Promoção encerrada" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (campaign.current_users >= campaign.max_users) {
        return new Response(JSON.stringify({ valid: false, error: "Promoção encerrada — vagas esgotadas" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Calculate discount
    let discountInfo: {
      type: string;
      value: number;
      discount_price?: number;
      normal_price?: number;
      duration_days?: number;
      currency?: string;
    };

    if (coupon.type === "special_offer" && campaign) {
      discountInfo = {
        type: "special_offer",
        value: campaign.discount_price,
        discount_price: campaign.discount_price,
        normal_price: campaign.normal_price,
        duration_days: campaign.duration_days,
        currency: campaign.currency,
      };
    } else if (coupon.type === "percentage") {
      discountInfo = {
        type: "percentage",
        value: coupon.value,
      };
    } else {
      discountInfo = {
        type: "fixed_amount",
        value: coupon.value,
        currency: coupon.currency,
      };
    }

    return new Response(JSON.stringify({
      valid: true,
      coupon_id: coupon.id,
      campaign_id: campaign?.id || null,
      code: coupon.code,
      ...discountInfo,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    return new Response(JSON.stringify({ valid: false, error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
