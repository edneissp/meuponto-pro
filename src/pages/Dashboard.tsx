import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DollarSign, ShoppingCart, Package, TrendingUp, CalendarIcon, Percent } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const COLORS = ["hsl(24, 95%, 53%)", "hsl(38, 95%, 55%)", "hsl(142, 76%, 36%)", "hsl(200, 80%, 50%)", "hsl(280, 60%, 50%)"];

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stats, setStats] = useState({ totalSales: 0, totalRevenue: 0, totalProducts: 0, avgTicket: 0, realMargin: 0 });
  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const d = selectedDate;
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
      const [salesRes, productsRes, saleItemsRes] = await Promise.all([
        supabase.from("sales").select("*").eq("status", "completed").gte("created_at", startOfDay).lt("created_at", endOfDay),
        supabase.from("products").select("id, purchase_price, sale_price"),
        supabase.from("sale_items").select("product_id, quantity, unit_price, total").gte("created_at", startOfDay).lt("created_at", endOfDay),
      ]);
      const sales = salesRes.data;
      const products = productsRes.data;
      const saleItems = saleItemsRes.data;

      if (sales) {
        const revenue = sales.reduce((sum, s) => sum + Number(s.total), 0);

        // Calculate real margin from sale items vs purchase prices
        let totalCost = 0;
        if (saleItems && products) {
          const productMap = new Map(products.map(p => [p.id, Number(p.purchase_price)]));
          saleItems.forEach(item => {
            const cost = productMap.get(item.product_id) || 0;
            totalCost += cost * item.quantity;
          });
        }
        const realMargin = revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0;

        setStats({
          totalSales: sales.length,
          totalRevenue: revenue,
          totalProducts: products?.length || 0,
          avgTicket: sales.length > 0 ? revenue / sales.length : 0,
          realMargin,
        });

        const byDay: Record<string, number> = {};
        const byMethod: Record<string, number> = {};
        sales.forEach(s => {
          const day = new Date(s.created_at).toLocaleDateString("pt-BR", { weekday: "short" });
          byDay[day] = (byDay[day] || 0) + Number(s.total);
          const methodLabel = s.payment_method === "cash" ? "Dinheiro" : s.payment_method === "pix" ? "Pix" : s.payment_method === "credit_card" ? "Crédito" : "Débito";
          byMethod[methodLabel] = (byMethod[methodLabel] || 0) + 1;
        });
        setSalesByDay(Object.entries(byDay).map(([name, value]) => ({ name, value })));
        setPaymentMethods(Object.entries(byMethod).map(([name, value]) => ({ name, value })));
      }
    };
    loadData();
  }, [selectedDate]);

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const statCards = [
    { label: `Vendas ${isToday ? "Hoje" : format(selectedDate, "dd/MM")}`, value: stats.totalSales, icon: ShoppingCart, fmt: (v: number) => v.toString() },
    { label: "Receita Total", value: stats.totalRevenue, icon: DollarSign, fmt: (v: number) => `R$ ${v.toFixed(2)}` },
    { label: "Produtos Ativos", value: stats.totalProducts, icon: Package, fmt: (v: number) => v.toString() },
    { label: "Ticket Médio", value: stats.avgTicket, icon: TrendingUp, fmt: (v: number) => `R$ ${v.toFixed(2)}` },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Date Picker */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {isToday ? "Dashboard — Hoje" : `Dashboard — ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}`}
        </h2>
        <div className="flex items-center gap-2">
          {!isToday && (
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
              Hoje
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !isToday && "border-primary text-primary")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                disabled={(date) => date > new Date()}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <Card key={i} className="p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.fmt(s.value)}</p>
              </div>
              <div className="h-11 w-11 rounded-lg gradient-primary flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 shadow-card">
          <h3 className="font-semibold mb-4">Vendas por Dia</h3>
          <div className="h-64">
            {salesByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(24, 95%, 53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Nenhuma venda registrada neste dia
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <h3 className="font-semibold mb-4">Formas de Pagamento</h3>
          <div className="h-64">
            {paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentMethods} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {paymentMethods.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
