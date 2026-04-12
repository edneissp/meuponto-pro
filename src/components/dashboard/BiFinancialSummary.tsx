import { Card } from "@/components/ui/card";

interface BiFinancialSummaryProps {
  grossRevenue: number;
  expenses: number;
  grossProfit: number;
  marginPercent: number;
}

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BiFinancialSummary = ({ grossRevenue, expenses, grossProfit, marginPercent }: BiFinancialSummaryProps) => {
  const rows = [
    { label: "Receita Bruta", value: fmt(grossRevenue), bold: true },
    { label: "Despesas", value: `- ${fmt(expenses)}`, color: "text-destructive" },
    { label: "Lucro Bruto", value: fmt(grossProfit), bold: true, color: grossProfit >= 0 ? "text-emerald-600" : "text-destructive" },
    { label: "Margem", value: `${marginPercent.toFixed(1)}%`, color: marginPercent >= 0 ? "text-emerald-600" : "text-destructive" },
  ];

  return (
    <Card className="p-5 shadow-card">
      <h3 className="font-semibold mb-4 text-sm">Indicadores Financeiros</h3>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between py-1 border-b border-border last:border-0">
            <span className={`text-sm ${r.bold ? "font-semibold" : "text-muted-foreground"}`}>{r.label}</span>
            <span className={`text-sm font-mono ${r.bold ? "font-bold" : ""} ${r.color || ""}`}>{r.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default BiFinancialSummary;
