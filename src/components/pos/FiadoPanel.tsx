import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, UserPlus, CheckCircle, BookOpen, DollarSign, History } from "lucide-react";
import { toast } from "sonner";

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

interface FiadoPanelProps {
  onClose: () => void;
}

const formatCurrency = (value: number) => `R$ ${Number(value || 0).toFixed(2)}`;

const FiadoPanel = ({ onClose }: FiadoPanelProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [fiados, setFiados] = useState<FiadoRecord[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [partialDialogOpen, setPartialDialogOpen] = useState(false);
  const [partialFiado, setPartialFiado] = useState<FiadoRecord | null>(null);
  const [partialValue, setPartialValue] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const getTenantId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    return profile?.tenant_id || null;
  };

  const loadCustomers = async () => {
    const { data, error } = await supabase.from("customers").select("*").order("name");
    if (error) {
      toast.error("Erro ao carregar clientes");
      return;
    }
    if (data) setCustomers(data);
  };

  const loadFiados = async (customerId?: string) => {
    let query = supabase
      .from("fiados")
      .select("id, amount, paid_amount, paid, paid_at, notes, created_at, customer_id, customers(name)")
      .order("paid", { ascending: true })
      .order("created_at", { ascending: false });

    if (customerId) query = query.eq("customer_id", customerId);

    const { data, error } = await query;
    if (error) {
      toast.error("Erro ao carregar fiados");
      return;
    }

    const baseFiados = ((data || []) as Omit<FiadoRecord, "payment_history">[]);

    if (baseFiados.length === 0) {
      setFiados([]);
      return;
    }

    const fiadoIds = baseFiados.map((fiado) => fiado.id);
    const { data: paymentsData, error: paymentsError } = await supabase
      .from("fiado_payments")
      .select("id, fiado_id, amount, paid_at, notes")
      .in("fiado_id", fiadoIds)
      .order("paid_at", { ascending: false });

    if (paymentsError) {
      toast.error("Erro ao carregar histórico de pagamentos");
      return;
    }

    const paymentsByFiado = ((paymentsData || []) as FiadoPayment[]).reduce<Record<string, FiadoPayment[]>>((acc, payment) => {
      if (!acc[payment.fiado_id]) acc[payment.fiado_id] = [];
      acc[payment.fiado_id].push(payment);
      return acc;
    }, {});

    setFiados(
      baseFiados.map((fiado) => ({
        ...fiado,
        payment_history: paymentsByFiado[fiado.id] || [],
      }))
    );
  };

  useEffect(() => {
    loadCustomers();
    loadFiados();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadFiados(selectedCustomer.id);
      return;
    }
    loadFiados();
  }, [selectedCustomer]);

  const addCustomer = async () => {
    if (!newName.trim()) return toast.error("Nome é obrigatório");
    setLoading(true);

    const tenantId = await getTenantId();
    if (!tenantId) {
      setLoading(false);
      return toast.error("Sessão expirada");
    }

    const { error } = await supabase.from("customers").insert({
      tenant_id: tenantId,
      name: newName.trim(),
      phone: newPhone.trim() || null,
    });

    if (error) {
      setLoading(false);
      return toast.error("Erro ao cadastrar cliente");
    }

    toast.success("Cliente cadastrado!");
    setNewName("");
    setNewPhone("");
    setAddDialogOpen(false);
    setLoading(false);
    loadCustomers();
  };

  const closePartialDialog = (open: boolean) => {
    setPartialDialogOpen(open);
    if (!open) {
      setPartialFiado(null);
      setPartialValue("");
      setPaymentNote("");
      setSubmittingPayment(false);
    }
  };

  const registerPayment = async (fiado: FiadoRecord, amount: number, note?: string) => {
    const tenantId = await getTenantId();
    if (!tenantId) return toast.error("Sessão expirada");

    const currentPaid = Number(fiado.paid_amount || 0);
    const totalAmount = Number(fiado.amount || 0);
    const nextPaidAmount = Number((currentPaid + amount).toFixed(2));
    const isFullyPaid = nextPaidAmount >= totalAmount;
    const paidAt = new Date().toISOString();

    const previousState = {
      paid_amount: fiado.paid_amount,
      paid: fiado.paid,
      paid_at: fiado.paid_at,
    };

    const { error: updateError } = await supabase
      .from("fiados")
      .update({
        paid_amount: nextPaidAmount,
        paid: isFullyPaid,
        paid_at: isFullyPaid ? paidAt : null,
      })
      .eq("id", fiado.id);

    if (updateError) {
      return toast.error("Erro ao atualizar saldo do fiado");
    }

    const { error: paymentError } = await supabase.from("fiado_payments").insert({
      tenant_id: tenantId,
      fiado_id: fiado.id,
      amount,
      paid_at: paidAt,
      notes: note?.trim() || (isFullyPaid ? "Quitação total" : "Pagamento parcial"),
    });

    if (paymentError) {
      await supabase.from("fiados").update(previousState).eq("id", fiado.id);
      return toast.error("Erro ao salvar histórico do pagamento");
    }

    await loadFiados(selectedCustomer?.id);

    toast.success(
      isFullyPaid
        ? "Fiado quitado por completo!"
        : `Pagamento de ${formatCurrency(amount)} registrado. Restam ${formatCurrency(totalAmount - nextPaidAmount)}`
    );
  };

  const markAsPaid = async (fiadoId: string) => {
    const fiado = fiados.find((entry) => entry.id === fiadoId);
    if (!fiado) return;

    const remaining = Number(fiado.amount) - Number(fiado.paid_amount || 0);
    if (remaining <= 0) return toast.error("Este fiado já está quitado");

    setSubmittingPayment(true);
    await registerPayment(fiado, remaining, "Quitação total");
    setSubmittingPayment(false);
  };

  const openPartialPayment = (fiado: FiadoRecord) => {
    setPartialFiado(fiado);
    setPartialValue("");
    setPaymentNote("");
    setPartialDialogOpen(true);
  };

  const submitPartialPayment = async () => {
    if (!partialFiado) return;

    const value = parseFloat(partialValue);
    const remaining = Number(partialFiado.amount) - Number(partialFiado.paid_amount || 0);

    if (!value || value <= 0) return toast.error("Informe um valor válido");
    if (value > remaining) return toast.error(`Valor máximo: ${formatCurrency(remaining)}`);

    setSubmittingPayment(true);
    await registerPayment(partialFiado, value, paymentNote || "Pagamento parcial");
    setSubmittingPayment(false);
    closePartialDialog(false);
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    (customer.phone && customer.phone.includes(search))
  );

  const pendingFiados = useMemo(
    () => fiados.filter((fiado) => Number(fiado.amount) - Number(fiado.paid_amount || 0) > 0),
    [fiados]
  );

  const settledFiados = useMemo(
    () => fiados.filter((fiado) => Number(fiado.amount) - Number(fiado.paid_amount || 0) <= 0),
    [fiados]
  );

  const totalPending = pendingFiados.reduce(
    (sum, fiado) => sum + Number(fiado.amount) - Number(fiado.paid_amount || 0),
    0
  );

  const totalReceived = fiados.reduce(
    (sum, fiado) => sum + fiado.payment_history.reduce((acc, payment) => acc + Number(payment.amount), 0),
    0
  );

  const renderFiadoCard = (fiado: FiadoRecord) => {
    const total = Number(fiado.amount);
    const paid = Number(fiado.paid_amount || 0);
    const remaining = Number((total - paid).toFixed(2));
    const paidPct = total > 0 ? (paid / total) * 100 : 0;
    const isSettled = remaining <= 0;

    return (
      <div key={fiado.id} className="p-3 rounded-lg bg-muted/50 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium truncate">{fiado.customers?.name || "Cliente"}</p>
              <Badge variant={isSettled ? "default" : paid > 0 ? "secondary" : "outline"}>
                {isSettled ? "Quitado" : paid > 0 ? "Parcial" : "Em aberto"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(fiado.created_at).toLocaleDateString("pt-BR")}
              {fiado.notes && ` • ${fiado.notes}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">{formatCurrency(remaining)}</p>
            <p className="text-xs text-muted-foreground">restante</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-background/70 p-3 text-center">
          <div>
            <p className="text-[11px] text-muted-foreground">Total</p>
            <p className="text-sm font-semibold">{formatCurrency(total)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Recebido</p>
            <p className="text-sm font-semibold text-primary">{formatCurrency(paid)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Saldo</p>
            <p className="text-sm font-semibold">{formatCurrency(remaining)}</p>
          </div>
        </div>

        {paid > 0 && (
          <div className="space-y-1">
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(paidPct, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground text-right">{paidPct.toFixed(0)}% recebido</p>
          </div>
        )}

        <div className="rounded-lg border border-border bg-background/70 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium">Histórico de pagamentos</p>
          </div>

          {fiado.payment_history.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum pagamento registrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {fiado.payment_history.map((payment) => (
                <div key={payment.id} className="flex items-start justify-between gap-3 text-xs">
                  <div>
                    <p className="font-medium">{payment.notes || "Pagamento"}</p>
                    <p className="text-muted-foreground">
                      {new Date(payment.paid_at).toLocaleDateString("pt-BR")} às {new Date(payment.paid_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isSettled && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openPartialPayment(fiado)}>
              <DollarSign className="h-3 w-3" />
              Pagamento Parcial
            </Button>
            <Button variant="default" size="sm" className="flex-1 gap-1" onClick={() => markAsPaid(fiado.id)} disabled={submittingPayment}>
              <CheckCircle className="h-3 w-3" />
              Quitar Total
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-full shadow-card">
      <div className="p-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="font-semibold truncate">Fiados</h2>
          <Badge variant="destructive">{formatCurrency(totalPending)}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Voltar ao PDV</Button>
      </div>

      <div className="p-4 space-y-3 border-b border-border">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-background/70 p-3">
            <p className="text-[11px] text-muted-foreground">Saldo pendente</p>
            <p className="text-lg font-bold">{formatCurrency(totalPending)}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/70 p-3">
            <p className="text-[11px] text-muted-foreground">Recebido no histórico</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(totalReceived)}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon"><UserPlus className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do cliente" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <Button className="w-full" onClick={addCustomer} disabled={loading}>
                  {loading ? "Salvando..." : "Cadastrar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCustomer(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !selectedCustomer ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            Todos
          </button>
          {filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => setSelectedCustomer(customer)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCustomer?.id === customer.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {customer.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {fiados.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum fiado encontrado</p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Pendentes</h3>
                <Badge variant="outline">{pendingFiados.length}</Badge>
              </div>
              {pendingFiados.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3">Nenhum fiado pendente.</p>
              ) : pendingFiados.map(renderFiadoCard)}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Quitados</h3>
                <Badge variant="outline">{settledFiados.length}</Badge>
              </div>
              {settledFiados.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3">Nenhum fiado quitado ainda.</p>
              ) : settledFiados.map(renderFiadoCard)}
            </div>
          </>
        )}
      </div>

      <Dialog open={partialDialogOpen} onOpenChange={closePartialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagamento Parcial</DialogTitle>
          </DialogHeader>
          {partialFiado && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm font-medium">{partialFiado.customers?.name}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total da dívida</span>
                  <span className="font-semibold">{formatCurrency(Number(partialFiado.amount))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Já pago</span>
                  <span>{formatCurrency(Number(partialFiado.paid_amount || 0))}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1">
                  <span>Restante</span>
                  <span>{formatCurrency(Number(partialFiado.amount) - Number(partialFiado.paid_amount || 0))}</span>
                </div>
              </div>

              <div>
                <Label>Valor do pagamento (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(partialFiado.amount) - Number(partialFiado.paid_amount || 0)}
                  value={partialValue}
                  onChange={(e) => setPartialValue(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div>
                <Label>Observação do pagamento</Label>
                <Input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Ex.: pago em dinheiro"
                />
              </div>

              <Button className="w-full" onClick={submitPartialPayment} disabled={submittingPayment}>
                {submittingPayment ? "Registrando..." : "Confirmar Pagamento"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default FiadoPanel;
