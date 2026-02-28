import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// This function should be called by a cron job daily to check for expired subscriptions
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];

    // Find tenants with expired payments (active tenants whose last payment period_end has passed)
    const { data: activeTenantsData } = await supabase
      .from("tenants")
      .select("id")
      .eq("subscription_status", "active");

    if (!activeTenantsData || activeTenantsData.length === 0) {
      return new Response(JSON.stringify({ message: "No active tenants to check" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let suspendedCount = 0;

    for (const tenant of activeTenantsData) {
      // Get the latest approved payment
      const { data: latestPayment } = await supabase
        .from("payments")
        .select("period_end")
        .eq("tenant_id", tenant.id)
        .eq("status", "approved")
        .order("period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      // If no approved payment or period expired, suspend
      if (!latestPayment || latestPayment.period_end < today) {
        await supabase
          .from("tenants")
          .update({ subscription_status: "suspended" })
          .eq("id", tenant.id);
        suspendedCount++;
      }
    }

    return new Response(
      JSON.stringify({ checked: activeTenantsData.length, suspended: suspendedCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check subscriptions error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
