import { Card } from "@/components/ui/card";
import { DollarSign, ShoppingCart, TrendingUp, UtensilsCrossed, AlertTriangle, Banknote, CalendarDays, Percent } from "lucide-react";

interface BiKpiCardsProps {
  revenueToday: number;
  revenueMonth: number;
  profit: number;
  avgTicket: number;
  ordersToday: number;
  tablesOccupied: number;
  totalTables: number;
  fiadoPending: number;
  criticalStock: number;
}

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BiKpiCards = (props: BiKpiCardsProps) => {
  const cards = [
    { label: "Faturamento do dia", value: fmt(props.revenueToday), icon: DollarSign, color: "text-emerald-500" },
    { label: "Faturamento do mês", value: fmt(props.revenueMonth), icon: CalendarDays, color: "text-blue-500" },
    { label: "Lucro estimado", value: fmt(props.profit), icon: TrendingUp, color: props.profit >= 0 ? "text-emerald-500" : "text-destructive" },
    { label: "Ticket médio", value: fmt(props.avgTicket), icon: Banknote, color: "text-violet-500" },
    { label: "Pedidos do dia", value: props.ordersToday.toString(), icon: ShoppingCart, color: "text-primary" },
    { label: "Mesas ocupadas", value: `${props.tablesOccupied}/${props.totalTables}`, icon: UtensilsCrossed, color: "text-amber-500" },
    { label: "Fiado pendente", value: fmt(props.fiadoPending), icon: Percent, color: "text-destructive" },
    { label: "Estoque crítico", value: props.criticalStock.toString(), icon: AlertTriangle, color: props.criticalStock > 0 ? "text-destructive" : "text-emerald-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <Card key={i} className="p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{c.label}</p>
              <p className="text-lg font-bold truncate">{c.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default BiKpiCards;
