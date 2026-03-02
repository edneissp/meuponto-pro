import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, Package, CalendarDays, BookOpen, Printer } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

type Period = "7d" | "30d" | "90d";

const printSection = (title: string) => {
  const content = document.getElementById("report-print-area");
  if (!content) return;
  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (!printWindow) return;
  printWindow.document.write(`<html><head><title>${title}</title><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; font-size: 12px; padding: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    h2 { margin-bottom: 8px; }
    .text-right { text-align: right; }
    @media print { @page { margin: 10mm; } }
  </style></head><body><h2>${title}</h2>${content.innerHTML}
  <script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
  printWindow.document.close();
};

const Reports = () => {
  const [period, setPeriod] = useState<Period>("30d");
  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [fiadosByCustomer, setFiadosByCustomer] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total: 0, count: 0, avg: 0 });
  const [loading, setLoading] = useState(true);

  const periodDays = { "7d": 7, "30d": 30, "90d": 90 };

  useEffect(() => {
    loadAll();
  }, [period]);

  const loadAll = async () => {
    setLoading(true);
    const since = subDays(new Date(), periodDays[period]).toISOString();

    await Promise.all([loadSales(since), loadTopProducts(since), loadStockAlerts(), loadFiados()]);
    setLoading(false);
  };

  const loadSales = async (since: string) => {
    const { data } = await supabase
      .from("sales")
      .select("total, created_at")
      .eq("status", "completed")
      .gte("created_at", since)
      .order("created_at");

    if (!data) return;

    const revenue = data.reduce((s, r) => s + Number(r.total), 0);
    setSummary({ total: revenue, count: data.length, avg: data.length ? revenue / data.length : 0 });

    const byDay: Record<string, number> = {};
    data.forEach((s) => {
      const day = format(new Date(s.created_at), "dd/MM", { locale: ptBR });
      byDay[day] = (byDay[day] || 0) + Number(s.total);
    });
    setSalesByDay(Object.entries(byDay).map(([name, value]) => ({ name, value: +value.toFixed(2) })));
  };

  const loadTopProducts = async (since: string) => {
    const { data: items } = await supabase
      .from("sale_items")
      .select("product_id, quantity, total")
      .gte("created_at", since);

    if (!items?.length) { setTopProducts([]); return; }

    const grouped: Record<string, { qty: number; revenue: number }> = {};
    items.forEach((i) => {
      if (!grouped[i.product_id]) grouped[i.product_id] = { qty: 0, revenue: 0 };
      grouped[i.product_id].qty += i.quantity;
      grouped[i.product_id].revenue += Number(i.total);
    });

    const ids = Object.keys(grouped);
    const { data: products } = await supabase.from("products").select("id, name").in("id", ids);
    const nameMap = Object.fromEntries((products || []).map((p) => [p.id, p.name]));

    const sorted = Object.entries(grouped)
      .map(([id, v]) => ({ name: nameMap[id] || "—", qty: v.qty, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    setTopProducts(sorted);
  };

  const loadStockAlerts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, stock_quantity, min_stock, expiry_date")
      .eq("is_active", true)
      .order("stock_quantity");

    if (!data) return;

    const alerts: any[] = [];
    const today = new Date();

    data.forEach((p) => {
      if (p.stock_quantity <= 0) {
        alerts.push({ ...p, type: "out", label: "Sem estoque" });
      } else if (p.stock_quantity <= p.min_stock) {
        alerts.push({ ...p, type: "low", label: "Estoque baixo" });
      }
      if (p.expiry_date) {
        const exp = new Date(p.expiry_date);
        const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
        if (daysLeft <= 0) {
          alerts.push({ ...p, type: "expired", label: "Vencido" });
        } else if (daysLeft <= 15) {
          alerts.push({ ...p, type: "expiring", label: `Vence em ${daysLeft}d` });
        }
      }
    });

    setStockAlerts(alerts);
  };

  const loadFiados = async () => {
    const { data } = await supabase
      .from("fiados")
      .select("id, amount, created_at, notes, customers(name, phone)")
      .eq("paid", false)
      .order("created_at", { ascending: false });

    if (!data) return;

    const grouped: Record<string, { name: string; phone: string | null; total: number; count: number; items: any[] }> = {};
    data.forEach((f: any) => {
      const name = f.customers?.name || "Desconhecido";
      const key = name;
      if (!grouped[key]) grouped[key] = { name, phone: f.customers?.phone || null, total: 0, count: 0, items: [] };
      grouped[key].total += Number(f.amount);
      grouped[key].count += 1;
      grouped[key].items.push(f);
    });

    const sorted = Object.values(grouped).sort((a, b) => b.total - a.total);
    setFiadosByCustomer(sorted);
  };

  const badgeVariant = (type: string) => {
    if (type === "out" || type === "expired") return "destructive" as const;
    return "secondary" as const;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[180px]">
            <CalendarDays className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Receita no Período", value: `R$ ${summary.total.toFixed(2)}`, icon: TrendingUp },
          { label: "Total de Vendas", value: summary.count.toString(), icon: Package },
          { label: "Ticket Médio", value: `R$ ${summary.avg.toFixed(2)}`, icon: TrendingUp },
        ].map((c, i) => (
          <Card key={i} className="shadow-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold mt-1">{c.value}</p>
              </div>
              <div className="h-11 w-11 rounded-lg gradient-primary flex items-center justify-center">
                <c.icon className="h-5 w-5 text-primary-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Vendas por Período</TabsTrigger>
          <TabsTrigger value="products">Produtos Mais Vendidos</TabsTrigger>
          <TabsTrigger value="fiados">
            Fiados
            {fiadosByCustomer.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{fiadosByCustomer.reduce((s, c) => s + c.count, 0)}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alertas de Estoque
            {stockAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{stockAlerts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Sales chart */}
        <TabsContent value="sales">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Receita Diária</CardTitle>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => printSection("Relatório de Vendas")}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </CardHeader>
            <CardContent id="report-print-area">
              <div className="h-72">
                {salesByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Receita"]} />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Nenhuma venda no período selecionado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top products */}
        <TabsContent value="products">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Top 10 Produtos</CardTitle>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => printSection("Relatório de Produtos")}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <div className="space-y-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProducts} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                        <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                        <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Receita"]} />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd Vendida</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{i + 1}</TableCell>
                          <TableCell>{p.name}</TableCell>
                          <TableCell className="text-right">{p.qty}</TableCell>
                          <TableCell className="text-right">R$ {p.revenue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhuma venda no período selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fiados */}
        <TabsContent value="fiados">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Fiados Pendentes por Cliente
                {fiadosByCustomer.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    Total: R$ {fiadosByCustomer.reduce((s, c) => s + c.total, 0).toFixed(2)}
                  </Badge>
                )}
              </CardTitle>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => printSection("Relatório de Fiados Pendentes")}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </CardHeader>
            <CardContent>
              {fiadosByCustomer.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-right">Qtd Fiados</TableHead>
                      <TableHead className="text-right">Total Pendente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fiadosByCustomer.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                        <TableCell className="text-right">{c.count}</TableCell>
                        <TableCell className="text-right font-semibold">R$ {c.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground">
                  Nenhum fiado pendente 🎉
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock alerts */}
        <TabsContent value="alerts">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Alertas de Estoque e Validade
              </CardTitle>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => printSection("Relatório de Estoque e Validade")}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </CardHeader>
            <CardContent>
              {stockAlerts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Mín.</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockAlerts.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-right">{a.stock_quantity}</TableCell>
                        <TableCell className="text-right">{a.min_stock}</TableCell>
                        <TableCell>{a.expiry_date ? format(new Date(a.expiry_date), "dd/MM/yyyy") : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant(a.type)}>{a.label}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground">
                  Nenhum alerta de estoque no momento 🎉
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
