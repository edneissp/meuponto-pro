import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingDown, BookOpen, Wallet, BarChart3, FileText, CreditCard, Receipt } from "lucide-react";
import RevenueTab from "@/components/finance/RevenueTab";
import ExpensesTab from "@/components/finance/ExpensesTab";
import FiadoTab from "@/components/finance/FiadoTab";
import CashFlowTab from "@/components/finance/CashFlowTab";
import FinanceReportsTab from "@/components/finance/FinanceReportsTab";
import SubscriptionTab from "@/components/finance/SubscriptionTab";
import InvoicesTab from "@/components/finance/InvoicesTab";
import type { InvoiceRecord, SubscriptionRecord } from "@/components/finance/types";

const Finance = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  const getTenantId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("user_id", user.id).single();
    return profile?.tenant_id || null;
  };

  const loadData = async () => {
    const tenantId = await getTenantId();

    const [expRes, supRes, subscriptionRes, invoicesRes] = await Promise.all([
      supabase.from("expenses").select("*").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id, name").order("name"),
      tenantId
        ? supabase.from("subscriptions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(1).maybeSingle()
        : Promise.resolve({ data: null, error: null } as any),
      tenantId
        ? supabase.from("invoices").select("*").eq("tenant_id", tenantId).order("due_date", { ascending: false }).limit(20)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    setExpenses(expRes.data || []);
    setSuppliers(supRes.data || []);
    setSubscription((subscriptionRes.data as SubscriptionRecord | null) || null);
    setInvoices((invoicesRes.data || []) as InvoiceRecord[]);
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('finance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fiado_payments' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-foreground">Financeiro</h2>

      <Tabs defaultValue="revenue">
        <TabsList className="flex h-auto flex-wrap gap-2 bg-transparent p-0">
          <TabsTrigger value="revenue" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Receitas
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <TrendingDown className="h-4 w-4" />
            Despesas
          </TabsTrigger>
          <TabsTrigger value="fiado" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Fiado
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="gap-2">
            <Wallet className="h-4 w-4" />
            Fluxo de Caixa
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Assinatura
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt className="h-4 w-4" />
            Faturas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-4">
          <RevenueTab />
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <ExpensesTab
            expenses={expenses}
            suppliers={suppliers}
            onReload={loadData}
            getTenantId={getTenantId}
          />
        </TabsContent>

        <TabsContent value="fiado" className="mt-4">
          <FiadoTab />
        </TabsContent>

        <TabsContent value="cashflow" className="mt-4">
          <CashFlowTab />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <FinanceReportsTab />
        </TabsContent>

        <TabsContent value="subscription" className="mt-4">
          <SubscriptionTab subscription={subscription} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab invoices={invoices} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finance;
