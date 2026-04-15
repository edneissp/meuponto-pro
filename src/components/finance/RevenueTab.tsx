import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, ShoppingCart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const formatCurrency = (v: number) => `R$ ${Number(v || 0).toFixed(2)}`;

type Period = "7d" | "30d" | "month" | "all";

const RevenueTab = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [fiadoPayments, setFiadoPayments] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const now = new Date();
    let fromDate: Date | null = null;
    if (period === "7d") fromDate = new Date(now.getTime() - 7 * 86400000);
    else if (period === "30d") fromDate = new Date(now.getTime() - 30 * 86400000);
    else if (period === "month") fromDate = new Date(now.getFullYear(), now.getMonth(), 1);

    let salesQuery = supabase.from("sales").select("id, total, payment_method, created_at").eq("status", "completed").order("created_at", { ascending: false });
    let fiadoQuery = supabase.from("fiado_payments").select("id, amount, paid_at");

    if (fromDate) {
      const iso = fromDate.toISOString();
      salesQuery = salesQuery.gte("created_at", iso);
      fiadoQuery = fiadoQuery.gte("paid_at", iso);
    }

    const [salesRes, fiadoRes] = await Promise.all([salesQuery, fiadoQuery]);
    setSales(salesRes.data || []);
    setFiadoPayments(fiadoRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [period]);

  const totalSales = sales.reduce((s, v) => s + Number(v.total), 0);
  const totalFiadoReceived = fiadoPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalRevenue = totalSales + totalFiadoReceived;
  const avgTicket = sales.length > 0 ? totalSales / sales.length : 0;

  const paymentLabel: Record<string, string> = { cash: "Dinheiro", pix: "Pix", credit_card: "Crédito", debit_card: "Débito", fiado: "Fiado" };

  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => {
      const key = new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      map[key] = (map[key] || 0) + Number(s.total);
    });
    fiadoPayments.forEach(p => {
      const key = new Date(p.paid_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      map[key] = (map[key] || 0) + Number(p.amount);
    });
    return Object.entries(map).map(([name, receita]) => ({ name, receita }));
  }, [sales, fiadoPayments]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={period} onValueChange={v => setPeriod(v as Period)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="month">Mês atual</SelectItem>
            <SelectItem value="all">Tudo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-emerald-600/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Vendas Diretas</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
            </div>
            <div className="h-11 w-11 rounded-lg gradient-primary flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{sales.length} vendas</p>
        </Card>
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Fiado Recebido</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalFiadoReceived)}</p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-emerald-600/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-2xl font-bold">{formatCurrency(avgTicket)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5 shadow-card">
        <h3 className="font-semibold mb-4">Receita por Dia</h3>
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `R$${v}`} />
                <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Receita"]} />
                <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">Nenhum dado no período</div>
          )}
        </div>
      </Card>

      {!loading && sales.length > 0 && (
        <Card className="shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Forma Pgto</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.slice(0, 50).map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="outline">{paymentLabel[s.payment_method] || s.payment_method}</Badge></TableCell>
                  <TableCell className="font-medium">{formatCurrency(Number(s.total))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default RevenueTab;
