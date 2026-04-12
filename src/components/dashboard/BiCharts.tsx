import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from "recharts";

const COLORS = ["hsl(24,95%,53%)", "hsl(38,95%,55%)", "hsl(142,76%,36%)", "hsl(200,80%,50%)", "hsl(280,60%,50%)", "hsl(350,70%,55%)"];
const curr = (v: number) => `R$ ${v.toFixed(0)}`;

const Empty = ({ text }: { text: string }) => (
  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">{text}</div>
);

interface BiChartsProps {
  salesByDay: { name: string; receita: number }[];
  salesByMonth: { name: string; receita: number }[];
  topProducts: { name: string; quantidade: number; total: number }[];
  paymentMethods: { name: string; value: number }[];
  fiadoEvolution: { name: string; aberto: number; recebido: number }[];
  revenueVsExpense: { name: string; receita: number; despesa: number }[];
  peakHours: { hour: string; vendas: number }[];
}

const BiCharts = (props: BiChartsProps) => {
  return (
    <>
      {/* Row 1: Daily Sales + Payment Methods */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 shadow-card">
          <h3 className="font-semibold mb-4 text-sm">Vendas por Dia</h3>
          <div className="h-64">
            {props.salesByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={props.salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={curr} />
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Bar dataKey="receita" name="Receita" fill="hsl(24,95%,53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty text="Sem dados" />}
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <h3 className="font-semibold mb-4 text-sm">Formas de Pagamento</h3>
          <div className="h-64">
            {props.paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={props.paymentMethods} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {props.paymentMethods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <Empty text="Sem dados" />}
          </div>
        </Card>
      </div>

      {/* Row 2: Monthly Sales + Revenue vs Expense */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 shadow-card">
          <h3 className="font-semibold mb-4 text-sm">Vendas por Mês (últimos 12 meses)</h3>
          <div className="h-64">
            {props.salesByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={props.salesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={curr} />
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Line type="monotone" dataKey="receita" name="Receita" stroke="hsl(142,76%,36%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Empty text="Sem dados" />}
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <h3 className="font-semibold mb-4 text-sm">Receita × Despesa</h3>
          <div className="h-64">
            {props.revenueVsExpense.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={props.revenueVsExpense}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={curr} />
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="hsl(142,76%,36%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesa" name="Despesa" fill="hsl(0,84%,60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty text="Sem dados" />}
          </div>
        </Card>
      </div>

      {/* Row 3: Top Products + Peak Hours */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 shadow-card">
          <h3 className="font-semibold mb-4 text-sm">Top 10 Produtos Mais Vendidos</h3>
          <div className="h-80">
            {props.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={props.topProducts} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} width={110} />
                  <Tooltip formatter={(v: number, name: string) => name === "total" ? `R$ ${v.toFixed(2)}` : v} />
                  <Legend />
                  <Bar dataKey="quantidade" name="Qtd" fill="hsl(24,95%,53%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty text="Sem dados" />}
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <h3 className="font-semibold mb-4 text-sm">Horários de Pico</h3>
          <div className="h-80">
            {props.peakHours.some(h => h.vendas > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={props.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="vendas" name="Vendas" stroke="hsl(24,95%,53%)" fill="hsl(24,95%,53%)" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <Empty text="Sem dados" />}
          </div>
        </Card>
      </div>

      {/* Row 4: Fiado Evolution */}
      <Card className="p-5 shadow-card">
        <h3 className="font-semibold mb-4 text-sm">Evolução do Fiado</h3>
        <div className="h-64">
          {props.fiadoEvolution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={props.fiadoEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={curr} />
                <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                <Legend />
                <Area type="monotone" dataKey="aberto" name="Em aberto" stroke="hsl(0,84%,60%)" fill="hsl(0,84%,60%)" fillOpacity={0.2} />
                <Area type="monotone" dataKey="recebido" name="Recebido" stroke="hsl(142,76%,36%)" fill="hsl(142,76%,36%)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <Empty text="Sem dados" />}
        </div>
      </Card>
    </>
  );
};

export default BiCharts;
