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

    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // Mercado Pago sends different notification types
    if (body.type !== "payment" && body.action !== "payment.updated" && body.action !== "payment.created") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment details from Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}` },
    });

    if (!mpResponse.ok) {
      throw new Error(`MP API error [${mpResponse.status}]`);
    }

    const payment = await mpResponse.json();
    console.log("Payment details:", JSON.stringify({
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
    }));

    const tenantId = payment.external_reference;
    if (!tenantId) {
      throw new Error("No tenant ID in external_reference");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Map MP status to our status
    const statusMap: Record<string, string> = {
      approved: "approved",
      pending: "pending",
      in_process: "pending",
      rejected: "rejected",
      refunded: "refunded",
      cancelled: "rejected",
    };

    const mappedStatus = statusMap[payment.status] || "pending";

    // Update or insert payment record
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("mercado_pago_preference_id", payment.preference_id)
      .maybeSingle();

    if (existingPayment) {
      await supabase
        .from("payments")
        .update({
          status: mappedStatus,
          mercado_pago_payment_id: String(paymentId),
          payment_method: payment.payment_method_id || payment.payment_type_id,
          paid_at: mappedStatus === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", existingPayment.id);
    } else {
      await supabase.from("payments").insert({
        tenant_id: tenantId,
        amount: payment.transaction_amount || 39.90,
        status: mappedStatus,
        mercado_pago_payment_id: String(paymentId),
        mercado_pago_preference_id: payment.preference_id,
        payment_method: payment.payment_method_id || payment.payment_type_id,
        paid_at: mappedStatus === "approved" ? new Date().toISOString() : null,
      });
    }

    // If approved, activate tenant and set period
    if (mappedStatus === "approved") {
      await supabase
        .from("tenants")
        .update({ subscription_status: "active" })
        .eq("id", tenantId);

      // Update period_end to 30 days from now
      if (existingPayment) {
        await supabase
          .from("payments")
          .update({
            period_start: new Date().toISOString().split("T")[0],
            period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          })
          .eq("id", existingPayment.id);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
