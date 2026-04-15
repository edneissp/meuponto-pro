import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const fmt = (v: number) => `R$ ${Number(v || 0).toFixed(2)}`;

const FinanceReportsTab = () => {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return format(d, "yyyy-MM-dd");
  });
  const [to, setTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [data, setData] = useState<{ sales: number; fiadoReceived: number; expensesPaid: number; fiadoPending: number; expensesPending: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const fromISO = new Date(from).toISOString();
    const toISO = new Date(to + "T23:59:59").toISOString();

    const [salesRes, fpRes, expRes, fiadosRes] = await Promise.all([
      supabase.from("sales").select("total").eq("status", "completed").gte("created_at", fromISO).lte("created_at", toISO),
      supabase.from("fiado_payments").select("amount").gte("paid_at", fromISO).lte("paid_at", toISO),
      supabase.from("expenses").select("amount, paid_amount, paid, payment_status").gte("created_at", fromISO).lte("created_at", toISO),
      supabase.from("fiados").select("amount, paid_amount").eq("paid", false),
    ]);

    const sales = (salesRes.data || []).reduce((s, v) => s + Number(v.total), 0);
    const fiadoReceived = (fpRes.data || []).reduce((s, p) => s + Number(p.amount), 0);
    const exps = expRes.data || [];
    const expensesPaid = exps.filter(e => e.paid).reduce((s, e) => s + Number(e.paid_amount || e.amount), 0);
    const expensesPending = exps.filter(e => !e.paid).reduce((s, e) => s + (Number(e.amount) - Number(e.paid_amount || 0)), 0);
    const fiadoPending = (fiadosRes.data || []).reduce((s, f) => s + (Number(f.amount) - Number(f.paid_amount || 0)), 0);

    setData({ sales, fiadoReceived, expensesPaid, fiadoPending, expensesPending });
    setLoading(false);
  };

  useEffect(() => { generate(); }, []);

  const totalRevenue = (data?.sales || 0) + (data?.fiadoReceived || 0);
  const netBalance = totalRevenue - (data?.expensesPaid || 0);

  const rows = data ? [
    { label: "Vendas Diretas", value: data.sales, type: "in" },
    { label: "Fiado Recebido", value: data.fiadoReceived, type: "in" },
    { label: "Total Receitas", value: totalRevenue, type: "total-in" },
    { label: "Despesas Pagas", value: data.expensesPaid, type: "out" },
    { label: "Saldo Líquido", value: netBalance, type: "net" },
    { label: "Fiado Pendente", value: data.fiadoPending, type: "info" },
    { label: "Despesas Pendentes", value: data.expensesPending, type: "info" },
  ] : [];

  const handleCSV = () => {
    if (!data) return;
    const csvRows = [
      ["Indicador", "Valor"],
      ...rows.map(r => [r.label, r.value.toFixed(2)]),
    ];
    const csv = csvRows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_financeiro_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 shadow-card">
        <h3 className="font-semibold mb-4">Relatório Financeiro por Período</h3>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <Label>De</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label>Até</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <Button onClick={generate} disabled={loading}>{loading ? "Gerando..." : "Gerar"}</Button>
        </div>
      </Card>

      {data && (
        <>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleCSV}>
              <Download className="mr-2 h-4 w-4" />CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />Imprimir
            </Button>
          </div>

          <Card className="shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicador</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} className={r.type === "net" || r.type === "total-in" ? "font-bold bg-muted/30" : ""}>
                    <TableCell>{r.label}</TableCell>
                    <TableCell className={`text-right font-medium ${r.type === "out" ? "text-destructive" : r.type === "in" || r.type === "total-in" ? "text-emerald-600" : r.type === "net" ? (r.value >= 0 ? "text-emerald-600" : "text-destructive") : ""}`}>
                      {fmt(r.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
};

export default FinanceReportsTab;
