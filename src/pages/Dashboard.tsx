import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Package, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(24, 95%, 53%)", "hsl(38, 95%, 55%)", "hsl(142, 76%, 36%)", "hsl(200, 80%, 50%)", "hsl(280, 60%, 50%)"];

const Dashboard = () => {
  const [stats, setStats] = useState({ totalSales: 0, totalRevenue: 0, totalProducts: 0, avgTicket: 0 });
  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      const { data: sales } = await supabase.from("sales").select("*").eq("status", "completed").gte("created_at", startOfDay).lt("created_at", endOfDay);
      const { data: products } = await supabase.from("products").select("id");

      if (sales) {
        const revenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
        setStats({
          totalSales: sales.length,
          totalRevenue: revenue,
          totalProducts: products?.length || 0,
          avgTicket: sales.length > 0 ? revenue / sales.length : 0,
        });

        // Group by day
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
  }, []);

  const statCards = [
    { label: "Vendas Hoje", value: stats.totalSales, icon: ShoppingCart, fmt: (v: number) => v.toString() },
    { label: "Receita Total", value: stats.totalRevenue, icon: DollarSign, fmt: (v: number) => `R$ ${v.toFixed(2)}` },
    { label: "Produtos Ativos", value: stats.totalProducts, icon: Package, fmt: (v: number) => v.toString() },
    { label: "Ticket Médio", value: stats.avgTicket, icon: TrendingUp, fmt: (v: number) => `R$ ${v.toFixed(2)}` },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
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
                Nenhuma venda registrada ainda
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
