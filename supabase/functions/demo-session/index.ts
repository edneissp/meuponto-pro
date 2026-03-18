import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEMO_EMAIL = "demo_account@youcontrol.local";
const DEMO_TENANT_NAME = "demo_account";
const DEMO_SLUG = "demo-account";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const publicClient = createClient(supabaseUrl, anonKey);

    const tenantId = await ensureDemoTenant(admin);
    const demoUser = await ensureDemoUser(admin, tenantId);
    await resetDemoData(admin, tenantId, demoUser.id);

    const tempPassword = `Demo-${crypto.randomUUID()}-Aa1!`;
    const { error: passwordError } = await admin.auth.admin.updateUserById(demoUser.id, {
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: "Conta Demo",
        business_name: DEMO_TENANT_NAME,
        origin: "demo",
      },
    });

    if (passwordError) throw passwordError;

    const { data: sessionData, error: signInError } = await publicClient.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: tempPassword,
    });

    if (signInError || !sessionData.session) {
      throw signInError || new Error("Não foi possível iniciar a sessão demo.");
    }

    return jsonResponse({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      tenant_id: tenantId,
      tenant_name: DEMO_TENANT_NAME,
      expires_in: 20 * 60,
    });
  } catch (error) {
    console.error("demo-session error", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro ao iniciar demonstração" },
      500,
    );
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function ensureDemoTenant(supabase: ReturnType<typeof createClient>) {
  const { data: existingTenant, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("public_slug", DEMO_SLUG)
    .maybeSingle();

  if (error) throw error;

  if (existingTenant?.id) {
    const { error: updateError } = await supabase
      .from("tenants")
      .update({
        name: DEMO_TENANT_NAME,
        ativo: true,
        plano: "trial",
        subscription_status: "trial",
        origin: "demo",
      } as never)
      .eq("id", existingTenant.id);

    if (updateError) throw updateError;
    return existingTenant.id;
  }

  const { data: createdTenant, error: insertError } = await supabase
    .from("tenants")
    .insert({
      name: DEMO_TENANT_NAME,
      public_slug: DEMO_SLUG,
      ativo: true,
      plano: "trial",
      subscription_status: "trial",
      origin: "demo",
      billing_contact_email: DEMO_EMAIL,
      billing_customer_name: "Conta Demo",
    } as never)
    .select("id")
    .single();

  if (insertError || !createdTenant) throw insertError || new Error("Erro ao criar tenant demo");
  return createdTenant.id;
}

async function ensureDemoUser(supabase: ReturnType<typeof createClient>, tenantId: string) {
  const existingUser = await findUserByEmail(supabase, DEMO_EMAIL);

  if (existingUser) {
    await ensureDemoMembership(supabase, existingUser.id, tenantId);
    return existingUser;
  }

  const initialPassword = `Seed-${crypto.randomUUID()}-Aa1!`;
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: initialPassword,
    email_confirm: true,
    user_metadata: {
      full_name: "Conta Demo",
      business_name: DEMO_TENANT_NAME,
      origin: "demo",
    },
  });

  if (error || !data.user) throw error || new Error("Erro ao criar usuário demo");
  await ensureDemoMembership(supabase, data.user.id, tenantId);
  return data.user;
}

async function ensureDemoMembership(supabase: ReturnType<typeof createClient>, userId: string, tenantId: string) {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingProfile?.id) {
    const { error } = await supabase
      .from("profiles")
      .update({ tenant_id: tenantId, full_name: "Conta Demo" })
      .eq("id", existingProfile.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("profiles").insert({
      user_id: userId,
      tenant_id: tenantId,
      full_name: "Conta Demo",
    });

    if (error) throw error;
  }

  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("role", "owner")
    .maybeSingle();

  if (!existingRole?.id) {
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      tenant_id: tenantId,
      role: "owner",
    });

    if (error) throw error;
  }
}

async function findUserByEmail(supabase: ReturnType<typeof createClient>, email: string) {
  let page = 1;

  while (page <= 5) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}

async function resetDemoData(supabase: ReturnType<typeof createClient>, tenantId: string, userId: string) {
  await clearTenantData(supabase, tenantId);

  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .insert([
      { tenant_id: tenantId, name: "Bebidas" },
      { tenant_id: tenantId, name: "Lanches" },
      { tenant_id: tenantId, name: "Sobremesas" },
    ])
    .select("id, name");

  if (categoryError || !categories) throw categoryError || new Error("Erro ao criar categorias demo");

  const categoryMap = Object.fromEntries(categories.map((category) => [category.name, category.id]));

  const { data: suppliers, error: supplierError } = await supabase
    .from("suppliers")
    .insert([
      { tenant_id: tenantId, name: "Distribuidora Central", phone: "71999990001" },
      { tenant_id: tenantId, name: "Mercado Bom Preço", phone: "71999990002" },
    ])
    .select("id, name");

  if (supplierError || !suppliers) throw supplierError || new Error("Erro ao criar fornecedores demo");

  const supplierMap = Object.fromEntries(suppliers.map((supplier) => [supplier.name, supplier.id]));

  const { data: products, error: productError } = await supabase
    .from("products")
    .insert([
      {
        tenant_id: tenantId,
        name: "Hambúrguer Artesanal",
        category_id: categoryMap["Lanches"],
        purchase_price: 12.5,
        sale_price: 28.9,
        stock_quantity: 25,
        min_stock: 5,
        expiry_date: null,
      },
      {
        tenant_id: tenantId,
        name: "Refrigerante 350ml",
        category_id: categoryMap["Bebidas"],
        purchase_price: 3.2,
        sale_price: 7.5,
        stock_quantity: 40,
        min_stock: 10,
        expiry_date: new Date(Date.now() + 8 * 86400000).toISOString().split("T")[0],
      },
      {
        tenant_id: tenantId,
        name: "Brownie de Chocolate",
        category_id: categoryMap["Sobremesas"],
        purchase_price: 4.5,
        sale_price: 10,
        stock_quantity: 18,
        min_stock: 4,
        expiry_date: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
      },
      {
        tenant_id: tenantId,
        name: "Açaí 500ml",
        category_id: categoryMap["Sobremesas"],
        purchase_price: 9.2,
        sale_price: 19.9,
        stock_quantity: 16,
        min_stock: 5,
        expiry_date: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0],
      },
    ])
    .select("id, name, sale_price, purchase_price");

  if (productError || !products) throw productError || new Error("Erro ao criar produtos demo");

  const productMap = Object.fromEntries(products.map((product) => [product.name, product]));

  const { data: customers, error: customerError } = await supabase
    .from("customers")
    .insert([
      { tenant_id: tenantId, name: "Maria Silva", phone: "71988880001" },
      { tenant_id: tenantId, name: "João Souza", phone: "71988880002" },
      { tenant_id: tenantId, name: "Ana Lima", phone: "71988880003" },
    ])
    .select("id, name");

  if (customerError || !customers) throw customerError || new Error("Erro ao criar clientes demo");

  const customerMap = Object.fromEntries(customers.map((customer) => [customer.name, customer.id]));

  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .insert([
      {
        tenant_id: tenantId,
        user_id: userId,
        payment_method: "cash",
        subtotal: 43.9,
        discount: 0,
        tax_amount: 0,
        total: 43.9,
        status: "completed",
      },
      {
        tenant_id: tenantId,
        user_id: userId,
        payment_method: "pix",
        subtotal: 39.8,
        discount: 2,
        tax_amount: 0,
        total: 37.8,
        status: "completed",
      },
    ])
    .select("id");

  if (salesError || !sales) throw salesError || new Error("Erro ao criar vendas demo");

  const { error: saleItemsError } = await supabase.from("sale_items").insert([
    {
      sale_id: sales[0].id,
      product_id: productMap["Hambúrguer Artesanal"].id,
      tenant_id: tenantId,
      quantity: 1,
      unit_price: 28.9,
      total: 28.9,
    },
    {
      sale_id: sales[0].id,
      product_id: productMap["Refrigerante 350ml"].id,
      tenant_id: tenantId,
      quantity: 2,
      unit_price: 7.5,
      total: 15,
    },
    {
      sale_id: sales[1].id,
      product_id: productMap["Açaí 500ml"].id,
      tenant_id: tenantId,
      quantity: 2,
      unit_price: 19.9,
      total: 39.8,
    },
  ]);

  if (saleItemsError) throw saleItemsError;

  const { data: delivery, error: deliveryError } = await supabase
    .from("supplier_deliveries")
    .insert({
      tenant_id: tenantId,
      supplier_id: supplierMap["Distribuidora Central"],
      delivery_date: new Date().toISOString().split("T")[0],
      total_amount: 196,
      purchase_type: "traditional",
      delivery_status: "completed",
      payment_status: "pending",
      notes: "Carga de demonstração",
    } as never)
    .select("id")
    .single();

  if (deliveryError || !delivery) throw deliveryError || new Error("Erro ao criar entrega demo");

  const { error: deliveryItemsError } = await supabase.from("supplier_delivery_items").insert([
    {
      delivery_id: delivery.id,
      tenant_id: tenantId,
      product_id: productMap["Refrigerante 350ml"].id,
      quantity: 24,
      unit_price: 3.2,
      total: 76.8,
      expiry_date: new Date(Date.now() + 8 * 86400000).toISOString().split("T")[0],
    } as never,
    {
      delivery_id: delivery.id,
      tenant_id: tenantId,
      product_id: productMap["Brownie de Chocolate"].id,
      quantity: 20,
      unit_price: 4.5,
      total: 90,
      expiry_date: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
    } as never,
    {
      delivery_id: delivery.id,
      tenant_id: tenantId,
      product_id: productMap["Açaí 500ml"].id,
      quantity: 8,
      unit_price: 9.2,
      total: 73.6,
      expiry_date: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0],
    } as never,
  ]);

  if (deliveryItemsError) throw deliveryItemsError;

  const { error: expenseError } = await supabase.from("expenses").insert([
    {
      tenant_id: tenantId,
      description: "Entrega - Distribuidora Central",
      amount: 196,
      category: "Compra de Mercadorias",
      supplier_id: supplierMap["Distribuidora Central"],
      paid: false,
      due_date: new Date().toISOString().split("T")[0],
    },
    {
      tenant_id: tenantId,
      description: "Energia elétrica",
      amount: 120,
      category: "Operacional",
      paid: true,
      paid_at: new Date().toISOString(),
      due_date: new Date().toISOString().split("T")[0],
    },
  ]);

  if (expenseError) throw expenseError;

  const { error: fiadoError } = await supabase.from("fiados").insert({
    tenant_id: tenantId,
    customer_id: customerMap["Maria Silva"],
    amount: 32.5,
    paid: false,
    paid_amount: 0,
    notes: "Compra do balcão",
  });

  if (fiadoError) throw fiadoError;

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .insert({
      tenant_id: tenantId,
      plan_name: "YouControl Profissional",
      plan_price: 99.9,
      billing_cycle: "monthly",
      currency: "BRL",
      status: "trial",
      gateway: "asaas",
      customer_email: DEMO_EMAIL,
      customer_country: "BR",
      preferred_payment_method: "pix",
      trial_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      next_billing_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    } as never)
    .select("id")
    .single();

  if (subscriptionError || !subscription) throw subscriptionError || new Error("Erro ao criar assinatura demo");

  const { error: invoiceError } = await supabase.from("invoices").insert({
    tenant_id: tenantId,
    subscription_id: subscription.id,
    invoice_number: `DEMO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    amount: 99.9,
    currency: "BRL",
    payment_gateway: "asaas",
    status: "pending",
    due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
  } as never);

  if (invoiceError) throw invoiceError;
}

async function clearTenantData(supabase: ReturnType<typeof createClient>, tenantId: string) {
  const clearTable = async (table: string) => {
    const { error } = await supabase.from(table).delete().eq("tenant_id", tenantId);
    if (error) throw error;
  };

  const order = [
    "billing_webhook_events",
    "fiado_payments",
    "sale_item_optionals",
    "sale_items",
    "stock_movements",
    "supplier_price_history",
    "supplier_delivery_items",
    "order_items",
    "orders",
    "fiados",
    "sales",
    "expenses",
    "supplier_deliveries",
    "product_option_groups",
    "optionals",
    "optional_groups",
    "payments",
    "invoices",
    "subscriptions",
    "alerts",
    "customers",
    "suppliers",
    "categories",
    "products",
  ];

  for (const table of order) {
    await clearTable(table);
  }
}
