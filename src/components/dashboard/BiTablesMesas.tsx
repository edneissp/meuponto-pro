import { Card } from "@/components/ui/card";

interface BiTablesMesasProps {
  occupied: number;
  free: number;
  total: number;
  avgTimeMinutes: number | null;
  avgTicketPerTable: number;
}

const BiTablesMesas = ({ occupied, free, total, avgTimeMinutes, avgTicketPerTable }: BiTablesMesasProps) => {
  const items = [
    { label: "Ocupadas", value: occupied.toString() },
    { label: "Livres", value: free.toString() },
    { label: "Total", value: total.toString() },
    { label: "Tempo médio", value: avgTimeMinutes !== null ? `${avgTimeMinutes} min` : "—" },
    { label: "Ticket/mesa", value: `R$ ${avgTicketPerTable.toFixed(2)}` },
  ];

  return (
    <Card className="p-5 shadow-card">
      <h3 className="font-semibold mb-4 text-sm">Mesas</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {items.map((item, i) => (
          <div key={i} className="text-center">
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default BiTablesMesas;
