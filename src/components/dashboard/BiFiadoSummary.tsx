import { Card } from "@/components/ui/card";

interface FiadoCustomer {
  name: string;
  balance: number;
}

interface BiFiadoSummaryProps {
  totalOpen: number;
  totalReceived: number;
  defaultRate: number;
  topDebtors: FiadoCustomer[];
}

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BiFiadoSummary = ({ totalOpen, totalReceived, defaultRate, topDebtors }: BiFiadoSummaryProps) => {
  return (
    <Card className="p-5 shadow-card">
      <h3 className="font-semibold mb-4 text-sm">Fiado — Resumo</h3>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-xl font-bold text-destructive">{fmt(totalOpen)}</p>
          <p className="text-xs text-muted-foreground">Em aberto</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-emerald-600">{fmt(totalReceived)}</p>
          <p className="text-xs text-muted-foreground">Recebido</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">{defaultRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Inadimplência</p>
        </div>
      </div>
      {topDebtors.length > 0 && (
        <>
          <p className="text-xs font-medium text-muted-foreground mb-2">Maiores saldos</p>
          <div className="space-y-1">
            {topDebtors.map((c, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="truncate">{c.name}</span>
                <span className="font-mono text-destructive">{fmt(c.balance)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

export default BiFiadoSummary;
