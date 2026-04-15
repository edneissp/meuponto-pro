import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, subMonths, startOfMonth, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmt = (v: number) => `R$ ${Number(v || 0).toFixed(2)}`;

type Period = "7d" | "30d" | "month";

const CashFlowTab = () => {
  const [period, setPeriod] = useState<Period>("30d");
  const [sales, setSales] = useState<any[]>([]);
  const [fiadoPayments, setFiadoPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [fiados, setFiados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const now = new Date();
    let from: Date;
    if (period === "7d") from = startOfDay(subDays(now, 6));
    else if (period === "month") from = startOfMonth(now);
    else from = startOfDay(subDays(now, 29));

    const iso = from.toISOString();

    const [salesRes, fpRes, expRes, fiadosRes] = await Promise.all([
      supabase.from("sales").select("total, created_at").eq("status", "completed").gte("created_at", iso),
      supabase.from("fiado_payments").select("amount, paid_at").gte("paid_at", iso),
      supabase.from("expenses").select("amount, paid_amount, paid, paid_at, payment_status, due_date, created_at").gte("created_at", iso),
      supabase.from("fiados").select("amount, paid_amount, paid").eq("paid", false),
    ]);

    setSales(salesRes.data || []);
    setFiadoPayments(fpRes.data || []);
    setExpenses(expRes.data || []);
    setFiados(fiadosRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [period]);

  const totalIn = sales.reduce((s, v) => s + Number(v.total), 0) + fiadoPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalOut = expenses.filter(e => e.paid).reduce((s, e) => s + Number(e.paid_amount || e.amount), 0);
  const balance = totalIn - totalOut;
  const fiadoPending = fiados.reduce((s, f) => s + (Number(f.amount) - Number(f.paid_amount || 0)), 0);
  const expensesPending = expenses.filter(e => !e.paid).reduce((s, e) => s + (Number(e.amount) - Number(e.paid_amount || 0)), 0);
  const overdueExpenses = expenses.filter(e => !e.paid && e.due_date && new Date(e.due_date) < new Date());

  const chartData = useMemo(() => {
    const now = new Date();
    let from: Date;
    if (period === "7d") from = startOfDay(subDays(now, 6));
    else if (period === "month") from = startOfMonth(now);
    else from = startOfDay(subDays(now, 29));

    const days = eachDayOfInterval({ start: from, end: now });
    const map: Record<string, { entradas: number; saidas: number }> = {};
    days.forEach(d => { map[format(d, "dd/MM")] = { entradas: 0, saidas: 0 }; });

    sales.forEach(s => {
      const key = format(new Date(s.created_at), "dd/MM");
      if (map[key]) map[key].entradas += Number(s.total);
    });
    fiadoPayments.forEach(p => {
      const key = format(new Date(p.paid_at), "dd/MM");
      if (map[key]) map[key].entradas += Number(p.amount);
    });
    expenses.filter(e => e.paid && e.paid_at).forEach(e => {
      const key = format(new Date(e.paid_at), "dd/MM");
      if (map[key]) map[key].saidas += Number(e.paid_amount || e.amount);
    });

    return Object.entries(map).map(([name, d]) => ({
      name,
      entradas: Number(d.entradas.toFixed(2)),
      saidas: Number(d.saidas.toFixed(2)),
      saldo: Number((d.entradas - d.saidas).toFixed(2)),
    }));
  }, [sales, fiadoPayments, expenses, period]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={period} onValueChange={v => setPeriod(v as Period)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
            <SelectItem value="month">Mês atual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Entradas</p>
              <p className="text-2xl font-bold text-emerald-600">{fmt(totalIn)}</p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-emerald-600/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saídas</p>
              <p className="text-2xl font-bold text-destructive">{fmt(totalOut)}</p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
          </div>
        </Card>
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(balance)}</p>
            </div>
            <div className="h-11 w-11 rounded-lg gradient-primary flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        </Card>
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">A Receber (Fiado)</p>
              <p className="text-2xl font-bold text-primary">{fmt(fiadoPending)}</p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      {overdueExpenses.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
            {overdueExpenses.length} despesa(s) vencida(s) — {fmt(overdueExpenses.reduce((s, e) => s + (Number(e.amount) - Number(e.paid_amount || 0)), 0))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Despesas Pendentes</p>
          <p className="text-xl font-bold text-destructive">{fmt(expensesPending)}</p>
        </Card>
        <Card className="p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Previsão (saldo + a receber - a pagar)</p>
          <p className={`text-xl font-bold ${balance + fiadoPending - expensesPending >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {fmt(balance + fiadoPending - expensesPending)}
          </p>
        </Card>
      </div>

      <Card className="p-5 shadow-card">
        <h3 className="font-semibold mb-4">Fluxo de Caixa Diário</h3>
        <div className="h-72">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `R$${v}`} />
                <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="hsl(142, 76%, 36%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">Sem dados no período</div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CashFlowTab;
