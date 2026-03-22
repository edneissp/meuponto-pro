import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Search, DollarSign, CheckCircle, History, AlertCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface FiadoPayment {
  id: string;
  fiado_id: string;
  amount: number;
  paid_at: string;
  notes: string | null;
}

interface FiadoRecord {
  id: string;
  amount: number;
  paid_amount: number;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  customer_id: string;
  customers?: { name: string } | null;
  payment_history: FiadoPayment[];
}

const formatCurrency = (value: number) => `R$ ${Number(value || 0).toFixed(2)}`;

type StatusFilter = "all" | "pending" | "partial" | "paid";

const FiadoTab = () => {
  const [fiados, setFiados] = useState<FiadoRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Payment dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payFiado, setPayFiado] = useState<FiadoRecord | null>(null);
  const [payValue, setPayValue] = useState("");
  const [payNote, setPayNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailFiado, setDetailFiado] = useState<FiadoRecord | null>(null);

  const getTenantId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("user_id", user.id).single();
    return profile?.tenant_id || null;
  };

  const loadData = async () => {
    setLoading(true);
    const [custRes, fiadoRes] = await Promise.all([
      supabase.from("customers").select("*").order("name"),
      supabase.from("fiados").select("id, amount, paid_amount, paid, paid_at, notes, created_at, customer_id, customers(name)")
        .order("paid", { ascending: true })
        .order("created_at", { ascending: false }),
    ]);

    if (custRes.data) setCustomers(custRes.data);

    const baseFiados = (fiadoRes.data || []) as Omit<FiadoRecord, "payment_history">[];

    if (baseFiados.length === 0) {
      setFiados([]);
      setLoading(false);
      return;
    }

    const fiadoIds = baseFiados.map(f => f.id);
    const { data: paymentsData } = await supabase
      .from("fiado_payments")
      .select("id, fiado_id, amount, paid_at, notes")
      .in("fiado_id", fiadoIds)
      .order("paid_at", { ascending: false });

    const paymentsByFiado = ((paymentsData || []) as FiadoPayment[]).reduce<Record<string, FiadoPayment[]>>((acc, p) => {
      if (!acc[p.fiado_id]) acc[p.fiado_id] = [];
      acc[p.fiado_id].push(p);
      return acc;
    }, {});

    setFiados(baseFiados.map(f => ({ ...f, payment_history: paymentsByFiado[f.id] || [] })));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const registerPayment = async (fiado: FiadoRecord, amount: number, note?: string) => {
    const tenantId = await getTenantId();
    if (!tenantId) return toast.error("Sessão expirada");

    const currentPaid = Number(fiado.paid_amount || 0);
    const totalAmount = Number(fiado.amount || 0);
    const nextPaidAmount = Number((currentPaid + amount).toFixed(2));
    const isFullyPaid = nextPaidAmount >= totalAmount;
    const paidAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("fiados")
      .update({
        paid_amount: nextPaidAmount,
        paid: isFullyPaid,
        paid_at: isFullyPaid ? paidAt : null,
      })
      .eq("id", fiado.id);

    if (updateError) return toast.error("Erro ao atualizar saldo do fiado");

    const { error: paymentError } = await supabase.from("fiado_payments").insert({
      tenant_id: tenantId,
      fiado_id: fiado.id,
      amount,
      paid_at: paidAt,
      notes: note?.trim() || (isFullyPaid ? "Quitação total" : "Pagamento parcial"),
    });

    if (paymentError) return toast.error("Erro ao salvar histórico do pagamento");

    await loadData();
    toast.success(
      isFullyPaid
        ? "Fiado quitado por completo!"
        : `Pagamento de ${formatCurrency(amount)} registrado. Restam ${formatCurrency(totalAmount - nextPaidAmount)}`
    );
  };

  const openPayDialog = (fiado: FiadoRecord) => {
    setPayFiado(fiado);
    setPayValue("");
    setPayNote("");
    setPayDialogOpen(true);
  };

  const submitPayment = async () => {
    if (!payFiado) return;
    const value = parseFloat(payValue);
    const remaining = Number(payFiado.amount) - Number(payFiado.paid_amount || 0);
    if (!value || value <= 0) return toast.error("Informe um valor válido");
    if (value > remaining) return toast.error(`Valor máximo: ${formatCurrency(remaining)}`);
    setSubmitting(true);
    await registerPayment(payFiado, value, payNote);
    setSubmitting(false);
    setPayDialogOpen(false);
  };

  const markFullyPaid = async (fiado: FiadoRecord) => {
    const remaining = Number(fiado.amount) - Number(fiado.paid_amount || 0);
    if (remaining <= 0) return;
    setSubmitting(true);
    await registerPayment(fiado, remaining, "Quitação total");
    setSubmitting(false);
  };

  const getStatus = (fiado: FiadoRecord) => {
    const remaining = Number(fiado.amount) - Number(fiado.paid_amount || 0);
    if (remaining <= 0) return "paid";
    if (Number(fiado.paid_amount || 0) > 0) return "partial";
    return "pending";
  };

  const filteredFiados = useMemo(() => {
    return fiados.filter(f => {
      const status = getStatus(f);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (selectedCustomerFilter !== "all" && f.customer_id !== selectedCustomerFilter) return false;
      if (search) {
        const name = f.customers?.name?.toLowerCase() || "";
        if (!name.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [fiados, statusFilter, selectedCustomerFilter, search]);

  const totalPending = fiados
    .filter(f => getStatus(f) !== "paid")
    .reduce((sum, f) => sum + Number(f.amount) - Number(f.paid_amount || 0), 0);

  const totalReceived = fiados.reduce(
    (sum, f) => sum + f.payment_history.reduce((acc, p) => acc + Number(p.amount), 0), 0
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="destructive">Pendente</Badge>;
      case "partial": return <Badge className="bg-yellow-500/90 hover:bg-yellow-500 text-white">Parcial</Badge>;
      case "paid": return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Pago</Badge>;
      default: return null;
    }
  };

  // Chart data: payments received per month (last 6 months)
  const chartData = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(subMonths(now, 5));
    const end = endOfMonth(now);
    const months = eachMonthOfInterval({ start, end });

    const allPayments = fiados.flatMap(f => f.payment_history);

    return months.map(month => {
      const key = format(month, "yyyy-MM");
      const label = format(month, "MMM/yy", { locale: ptBR });
      const total = allPayments
        .filter(p => p.paid_at && format(new Date(p.paid_at), "yyyy-MM") === key)
        .reduce((sum, p) => sum + Number(p.amount), 0);
      return { name: label, recebido: total };
    });
  }, [fiados]);

  const hasChartData = chartData.some(d => d.recebido > 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Pendente</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalPending)}</p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
          </div>
        </Card>
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Recebido</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalReceived)}</p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-emerald-600/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Evolution chart */}
      <Card className="p-5 shadow-card">
        <h3 className="font-semibold mb-4">Evolução de Fiados Recebidos (últimos 6 meses)</h3>
        <div className="h-64">
          {hasChartData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRecebido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v: number) => `R$ ${v.toFixed(0)}`} />
                <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Recebido"]} />
                <Area type="monotone" dataKey="recebido" stroke="hsl(142, 76%, 36%)" strokeWidth={2} fill="url(#colorRecebido)" dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Nenhum recebimento registrado no período
            </div>
          )}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="partial">Parcial</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedCustomerFilter} onValueChange={setSelectedCustomerFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead className="hidden md:table-cell">Data</TableHead>
              <TableHead className="hidden lg:table-cell">Observação</TableHead>
              <TableHead className="w-36">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : filteredFiados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">Nenhum fiado encontrado</TableCell>
              </TableRow>
            ) : filteredFiados.map(fiado => {
              const status = getStatus(fiado);
              const remaining = Number(fiado.amount) - Number(fiado.paid_amount || 0);
              return (
                <TableRow key={fiado.id}>
                  <TableCell>{statusBadge(status)}</TableCell>
                  <TableCell className="font-medium">{fiado.customers?.name || "—"}</TableCell>
                  <TableCell>{formatCurrency(Number(fiado.amount))}</TableCell>
                  <TableCell className="text-emerald-600 font-medium">{formatCurrency(Number(fiado.paid_amount || 0))}</TableCell>
                  <TableCell className={remaining > 0 ? "text-destructive font-medium" : ""}>{formatCurrency(remaining)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {new Date(fiado.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-xs max-w-[200px] truncate">
                    {fiado.notes || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Ver detalhes" onClick={() => { setDetailFiado(fiado); setDetailDialogOpen(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {status !== "paid" && (
                        <>
                          <Button variant="ghost" size="icon" title="Registrar pagamento" onClick={() => openPayDialog(fiado)}>
                            <DollarSign className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Quitar total" onClick={() => markFullyPaid(fiado)} disabled={submitting}>
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Payment dialog */}
      <Dialog open={payDialogOpen} onOpenChange={open => { setPayDialogOpen(open); if (!open) { setPayFiado(null); setPayValue(""); setPayNote(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          {payFiado && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm font-medium">{payFiado.customers?.name}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{formatCurrency(Number(payFiado.amount))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Já pago</span>
                  <span>{formatCurrency(Number(payFiado.paid_amount || 0))}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1">
                  <span>Restante</span>
                  <span>{formatCurrency(Number(payFiado.amount) - Number(payFiado.paid_amount || 0))}</span>
                </div>
              </div>
              <div>
                <Label>Valor do pagamento (R$)</Label>
                <Input type="number" step="0.01" min="0.01" max={Number(payFiado.amount) - Number(payFiado.paid_amount || 0)} value={payValue} onChange={e => setPayValue(e.target.value)} placeholder="0.00" autoFocus />
              </div>
              <div>
                <Label>Descrição / Observação</Label>
                <Textarea value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Ex.: pagamento parcial via pix, acordo renegociado..." rows={3} />
              </div>
              <Button className="w-full" onClick={submitPayment} disabled={submitting}>
                {submitting ? "Registrando..." : "Confirmar Pagamento"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={open => { setDetailDialogOpen(open); if (!open) setDetailFiado(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes do Fiado</DialogTitle></DialogHeader>
          {detailFiado && (() => {
            const total = Number(detailFiado.amount);
            const paid = Number(detailFiado.paid_amount || 0);
            const remaining = Number((total - paid).toFixed(2));
            const paidPct = total > 0 ? (paid / total) * 100 : 0;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 rounded-lg border border-border p-3 text-center">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Total</p>
                    <p className="text-sm font-semibold">{formatCurrency(total)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Recebido</p>
                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(paid)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Saldo</p>
                    <p className="text-sm font-semibold text-destructive">{formatCurrency(remaining)}</p>
                  </div>
                </div>

                {paid > 0 && (
                  <div className="space-y-1">
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(paidPct, 100)}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">{paidPct.toFixed(0)}% recebido</p>
                  </div>
                )}

                {detailFiado.notes && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Observação da venda</p>
                    <p className="text-sm">{detailFiado.notes}</p>
                  </div>
                )}

                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-medium">Histórico de pagamentos</p>
                  </div>
                  {detailFiado.payment_history.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum pagamento registrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailFiado.payment_history.map(p => (
                        <div key={p.id} className="flex items-start justify-between gap-3 text-xs">
                          <div>
                            <p className="font-medium">{p.notes || "Pagamento"}</p>
                            <p className="text-muted-foreground">
                              {new Date(p.paid_at).toLocaleDateString("pt-BR")} às{" "}
                              {new Date(p.paid_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <span className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FiadoTab;
