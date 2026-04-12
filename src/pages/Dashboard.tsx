import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import BiFilterBar, { type FilterPreset } from "@/components/dashboard/BiFilterBar";
import BiKpiCards from "@/components/dashboard/BiKpiCards";
import BiCharts from "@/components/dashboard/BiCharts";
import BiFinancialSummary from "@/components/dashboard/BiFinancialSummary";
import BiTablesMesas from "@/components/dashboard/BiTablesMesas";
import BiFiadoSummary from "@/components/dashboard/BiFiadoSummary";
import BiExportButtons from "@/components/dashboard/BiExportButtons";

const paymentLabel = (m: string) => {
  const map: Record<string, string> = { cash: "Dinheiro", pix: "Pix", credit_card: "Crédito", debit_card: "Débito", fiado: "Fiado" };
  return map[m] || m;
};

const Dashboard = () => {
  const [preset, setPreset] = useState<FilterPreset>("today");
  const [dateRange, setDateRange] = useState({ from: new Date(), to: new Date() });
  const [loading, setLoading] = useState(true);

  // raw data
  const [sales, setSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [fiados, setFiados] = useState<any[]>([]);
  const [fiadoPayments, setFiadoPayments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  // extended for charts
  const [sales30d, setSales30d] = useState<any[]>([]);
  const [sales12m, setSales12m] = useState<any[]>([]);
  const [expenses6m, setExpenses6m] = useState<any[]>([]);
  const [fiados6m, setFiados6m] = useState<any[]>([]);
  const [fiadoPayments6m, setFiadoPayments6m] = useState<any[]>([]);

  const range = useMemo(() => {
    const now = new Date();
    switch (preset) {
      case "today": return { from: startOfDay(now), to: endOfDay(now) };
      case "7d": return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
      case "30d": return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
      case "month": return { from: startOfMonth(now), to: endOfDay(now) };
      case "custom": return { from: startOfDay(dateRange.from), to: endOfDay(dateRange.to) };
    }
  }, [preset, dateRange]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const fromISO = range.from.toISOString();
    const toISO = range.to.toISOString();
    const now = new Date();
    const m12ago = subMonths(now, 11);
    const m6ago = subMonths(now, 5);
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();

    const [
      salesRes, saleItemsRes, productsRes, expensesRes, tablesRes,
      fiadosRes, fiadoPaymentsRes, ordersRes,
      sales30dRes, sales12mRes, expenses6mRes, fiados6mRes, fp6mRes,
    ] = await Promise.all([
      supabase.from("sales").select("*").eq("status", "completed").gte("created_at", fromISO).lte("created_at", toISO),
      supabase.from("sale_items").select("product_id, quantity, unit_price, total, sale_id, created_at").gte("created_at", fromISO).lte("created_at", toISO),
      supabase.from("products").select("id, name, purchase_price, sale_price, stock_quantity, min_stock"),
      supabase.from("expenses").select("amount, created_at, paid").gte("created_at", fromISO).lte("created_at", toISO),
      supabase.from("tables").select("id, status"),
      supabase.from("fiados").select("id, amount, paid_amount, paid, customer_id, customers(name)").eq("paid", false),
      supabase.from("fiado_payments").select("amount, paid_at").gte("paid_at", fromISO).lte("paid_at", toISO),
      supabase.from("orders").select("id, created_at, total, source").gte("created_at", todayStart).lte("created_at", todayEnd),
      // 30 days for daily chart
      supabase.from("sales").select("created_at, total, payment_method").eq("status", "completed").gte("created_at", startOfDay(subDays(now, 29)).toISOString()).lte("created_at", toISO),
      // 12 months
      supabase.from("sales").select("created_at, total").eq("status", "completed").gte("created_at", startOfMonth(m12ago).toISOString()),
      // expenses 6m
      supabase.from("expenses").select("amount, created_at").gte("created_at", startOfMonth(m6ago).toISOString()),
      // fiados 6m
      supabase.from("fiados").select("amount, paid_amount, created_at").gte("created_at", startOfMonth(m6ago).toISOString()),
      supabase.from("fiado_payments").select("amount, paid_at").gte("paid_at", startOfMonth(m6ago).toISOString()),
    ]);

    setSales(salesRes.data || []);
    setSaleItems(saleItemsRes.data || []);
    setProducts(productsRes.data || []);
    setExpenses(expensesRes.data || []);
    setTables(tablesRes.data || []);
    setFiados(fiadosRes.data || []);
    setFiadoPayments(fiadoPaymentsRes.data || []);
    setOrders(ordersRes.data || []);
    setSales30d(sales30dRes.data || []);
    setSales12m(sales12mRes.data || []);
    setExpenses6m(expenses6mRes.data || []);
    setFiados6m(fiados6mRes.data || []);
    setFiadoPayments6m(fp6mRes.data || []);
    setLoading(false);
  }, [range]);

  useEffect(() => { loadData(); }, [loadData]);

  // ---- KPI calculations ----
  const totalRevenue = sales.reduce((s, v) => s + Number(v.total), 0);
  const fiadoReceived = fiadoPayments.reduce((s, p) => s + Number(p.amount), 0);
  const revenueWithFiado = totalRevenue + fiadoReceived;
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = revenueWithFiado - totalExpenses;
  const avgTicket = sales.length > 0 ? revenueWithFiado / sales.length : 0;
  const occupiedTables = tables.filter(t => t.status === "occupied").length;
  const fiadoPending = fiados.reduce((s, f) => s + (Number(f.amount) - Number(f.paid_amount)), 0);
  const criticalStock = products.filter(p => p.stock_quantity <= p.min_stock).length;
  const margin = revenueWithFiado > 0 ? (profit / revenueWithFiado) * 100 : 0;

  // Revenue for month (separate calc)
  const monthStart = startOfMonth(new Date()).toISOString();
  const revenueMonth = sales12m.filter(s => s.created_at >= monthStart).reduce((sum, s) => sum + Number(s.total), 0);

  // ---- Chart data ----
  const salesByDay = useMemo(() => {
    const days = eachDayOfInterval({ start: startOfDay(subDays(new Date(), 29)), end: new Date() });
    const map: Record<string, number> = {};
    days.forEach(d => { map[format(d, "dd/MM")] = 0; });
    sales30d.forEach(s => {
      const key = format(new Date(s.created_at), "dd/MM");
      if (map[key] !== undefined) map[key] += Number(s.total);
    });
    return Object.entries(map).map(([name, receita]) => ({ name, receita }));
  }, [sales30d]);

  const salesByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const key = format(subMonths(new Date(), i), "MMM/yy", { locale: ptBR });
      map[key] = 0;
    }
    sales12m.forEach(s => {
      const key = format(new Date(s.created_at), "MMM/yy", { locale: ptBR });
      if (map[key] !== undefined) map[key] += Number(s.total);
    });
    return Object.entries(map).map(([name, receita]) => ({ name, receita }));
  }, [sales12m]);

  const topProducts = useMemo(() => {
    const nameMap = new Map(products.map(p => [p.id, p.name]));
    const priceMap = new Map(products.map(p => [p.id, Number(p.sale_price)]));
    const acc: Record<string, { name: string; quantidade: number; total: number }> = {};
    saleItems.forEach(item => {
      const name = nameMap.get(item.product_id) || "—";
      if (!acc[item.product_id]) acc[item.product_id] = { name: name.length > 22 ? name.slice(0, 22) + "…" : name, quantidade: 0, total: 0 };
      acc[item.product_id].quantidade += item.quantity;
      acc[item.product_id].total += Number(item.total);
    });
    return Object.values(acc).sort((a, b) => b.quantidade - a.quantidade).slice(0, 10);
  }, [saleItems, products]);

  const paymentMethods = useMemo(() => {
    const map: Record<string, number> = {};
    sales30d.forEach(s => {
      const label = paymentLabel(s.payment_method);
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sales30d]);

  const peakHours = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, vendas: 0 }));
    sales30d.forEach(s => {
      const h = new Date(s.created_at).getHours();
      hours[h].vendas += 1;
    });
    return hours;
  }, [sales30d]);

  const fiadoEvolution = useMemo(() => {
    const map: Record<string, { aberto: number; recebido: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const key = format(subMonths(new Date(), i), "MMM/yy", { locale: ptBR });
      map[key] = { aberto: 0, recebido: 0 };
    }
    fiados6m.forEach(f => {
      const key = format(new Date(f.created_at), "MMM/yy", { locale: ptBR });
      if (map[key]) map[key].aberto += Number(f.amount);
    });
    fiadoPayments6m.forEach(p => {
      const key = format(new Date(p.paid_at), "MMM/yy", { locale: ptBR });
      if (map[key]) map[key].recebido += Number(p.amount);
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d }));
  }, [fiados6m, fiadoPayments6m]);

  const revenueVsExpense = useMemo(() => {
    const map: Record<string, { receita: number; despesa: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const key = format(subMonths(new Date(), i), "MMM/yy", { locale: ptBR });
      map[key] = { receita: 0, despesa: 0 };
    }
    sales12m.forEach(s => {
      const key = format(new Date(s.created_at), "MMM/yy", { locale: ptBR });
      if (map[key]) map[key].receita += Number(s.total);
    });
    expenses6m.forEach(e => {
      const key = format(new Date(e.created_at), "MMM/yy", { locale: ptBR });
      if (map[key]) map[key].despesa += Number(e.amount);
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d }));
  }, [sales12m, expenses6m]);

  // ---- Fiado summary ----
  const totalFiadoOpen = fiados.reduce((s, f) => s + (Number(f.amount) - Number(f.paid_amount)), 0);
  const totalFiadoReceived = fiadoPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalFiadoAll = fiados.reduce((s, f) => s + Number(f.amount), 0);
  const defaultRate = totalFiadoAll > 0 ? (totalFiadoOpen / totalFiadoAll) * 100 : 0;
  const topDebtors = useMemo(() => {
    const debtors: { name: string; balance: number }[] = fiados.map(f => ({
      name: (f as any).customers?.name || "—",
      balance: Number(f.amount) - Number(f.paid_amount),
    }));
    // Group by name
    const grouped: Record<string, number> = {};
    debtors.forEach(d => { grouped[d.name] = (grouped[d.name] || 0) + d.balance; });
    return Object.entries(grouped)
      .map(([name, balance]) => ({ name, balance }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);
  }, [fiados]);

  // ---- Tables ----
  const avgTicketPerTable = useMemo(() => {
    const tableOrders = orders.filter(o => o.source === "table");
    if (tableOrders.length === 0) return 0;
    return tableOrders.reduce((s, o) => s + Number(o.total), 0) / tableOrders.length;
  }, [orders]);

  // ---- Export ----
  const handleExport = useCallback((fmt: "pdf" | "excel" | "csv") => {
    if (fmt === "csv") {
      const rows = [
        ["Indicador", "Valor"],
        ["Receita", revenueWithFiado.toFixed(2)],
        ["Despesas", totalExpenses.toFixed(2)],
        ["Lucro", profit.toFixed(2)],
        ["Margem", `${margin.toFixed(1)}%`],
        ["Ticket Médio", avgTicket.toFixed(2)],
        ["Vendas", sales.length.toString()],
        ["Fiado Pendente", fiadoPending.toFixed(2)],
        ["Estoque Crítico", criticalStock.toString()],
      ];
      const csv = rows.map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dashboard_${format(new Date(), "yyyyMMdd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exportado!");
      return;
    }
    if (fmt === "excel") {
      // Simple tab-separated export that opens in Excel
      const rows = [
        ["Indicador", "Valor"],
        ["Receita", revenueWithFiado.toFixed(2)],
        ["Despesas", totalExpenses.toFixed(2)],
        ["Lucro", profit.toFixed(2)],
        ["Margem %", margin.toFixed(1)],
        ["Ticket Médio", avgTicket.toFixed(2)],
        ["Total Vendas", sales.length.toString()],
        ["Fiado Pendente", fiadoPending.toFixed(2)],
        ["Estoque Crítico", criticalStock.toString()],
      ];
      const tsv = rows.map(r => r.join("\t")).join("\n");
      const blob = new Blob([tsv], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dashboard_${format(new Date(), "yyyyMMdd")}.xls`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel exportado!");
      return;
    }
    // PDF: print-friendly
    window.print();
    toast.success("PDF gerado!");
  }, [revenueWithFiado, totalExpenses, profit, margin, avgTicket, sales.length, fiadoPending, criticalStock]);

  return (
    <div className="space-y-6 animate-fade-in print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">Dashboard BI</h2>
        <div className="flex flex-wrap items-center gap-4">
          <BiExportButtons onExport={handleExport} />
        </div>
      </div>

      {/* Filters */}
      <BiFilterBar
        preset={preset}
        onPresetChange={setPreset}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <BiKpiCards
            revenueToday={sales.filter(s => s.created_at >= startOfDay(new Date()).toISOString()).reduce((sum, s) => sum + Number(s.total), 0)}
            revenueMonth={revenueMonth}
            profit={profit}
            avgTicket={avgTicket}
            ordersToday={orders.length}
            tablesOccupied={occupiedTables}
            totalTables={tables.length}
            fiadoPending={fiadoPending}
            criticalStock={criticalStock}
          />

          {/* Financial Summary + Tables + Fiado */}
          <div className="grid lg:grid-cols-3 gap-6">
            <BiFinancialSummary
              grossRevenue={revenueWithFiado}
              expenses={totalExpenses}
              grossProfit={profit}
              marginPercent={margin}
            />
            <BiTablesMesas
              occupied={occupiedTables}
              free={tables.length - occupiedTables}
              total={tables.length}
              avgTimeMinutes={null}
              avgTicketPerTable={avgTicketPerTable}
            />
            <BiFiadoSummary
              totalOpen={totalFiadoOpen}
              totalReceived={totalFiadoReceived}
              defaultRate={defaultRate}
              topDebtors={topDebtors}
            />
          </div>

          {/* Charts */}
          <BiCharts
            salesByDay={salesByDay}
            salesByMonth={salesByMonth}
            topProducts={topProducts}
            paymentMethods={paymentMethods}
            fiadoEvolution={fiadoEvolution}
            revenueVsExpense={revenueVsExpense}
            peakHours={peakHours}
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;
