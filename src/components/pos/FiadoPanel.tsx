import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, UserPlus, CheckCircle, BookOpen, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
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
}

interface FiadoPanelProps {
  onClose: () => void;
}

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

  const loadCustomers = async () => {
    const { data } = await supabase.from("customers").select("*").order("name");
    if (data) setCustomers(data);
  };

  const loadFiados = async (customerId?: string) => {
    let query = supabase
      .from("fiados")
      .select("*, customers(name)")
      .eq("paid", false)
      .order("created_at", { ascending: false });

    if (customerId) query = query.eq("customer_id", customerId);

    const { data } = await query;
    if (data) setFiados(data as FiadoRecord[]);
  };

  useEffect(() => {
    loadCustomers();
    loadFiados();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadFiados(selectedCustomer.id);
    } else {
      loadFiados();
    }
  }, [selectedCustomer]);

  const addCustomer = async () => {
    if (!newName.trim()) return toast.error("Nome é obrigatório");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return toast.error("Sessão expirada"); }

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("user_id", user.id).single();
    if (!profile) { setLoading(false); return toast.error("Perfil não encontrado"); }

    const { error } = await supabase.from("customers").insert({
      tenant_id: profile.tenant_id,
      name: newName.trim(),
      phone: newPhone.trim() || null,
    });

    if (error) { setLoading(false); return toast.error("Erro ao cadastrar cliente"); }

    toast.success("Cliente cadastrado!");
    setNewName("");
    setNewPhone("");
    setAddDialogOpen(false);
    setLoading(false);
    loadCustomers();
  };

  const markAsPaid = async (fiadoId: string) => {
    const fiado = fiados.find(f => f.id === fiadoId);
    if (!fiado) return;
    const { error } = await supabase
      .from("fiados")
      .update({ paid: true, paid_at: new Date().toISOString(), paid_amount: Number(fiado.amount) })
      .eq("id", fiadoId);

    if (error) return toast.error("Erro ao dar baixa");
    toast.success("Fiado pago!");
    loadFiados(selectedCustomer?.id);
  };

  const openPartialPayment = (fiado: FiadoRecord) => {
    setPartialFiado(fiado);
    setPartialValue("");
    setPartialDialogOpen(true);
  };

  const submitPartialPayment = async () => {
    if (!partialFiado) return;
    const value = parseFloat(partialValue);
    const remaining = Number(partialFiado.amount) - Number(partialFiado.paid_amount || 0);

    if (!value || value <= 0) return toast.error("Informe um valor válido");
    if (value > remaining) return toast.error(`Valor máximo: R$ ${remaining.toFixed(2)}`);

    const newPaidAmount = Number(partialFiado.paid_amount || 0) + value;
    const isFullyPaid = newPaidAmount >= Number(partialFiado.amount);

    const { error } = await supabase
      .from("fiados")
      .update({
        paid_amount: newPaidAmount,
        paid: isFullyPaid,
        paid_at: isFullyPaid ? new Date().toISOString() : null,
      })
      .eq("id", partialFiado.id);

    if (error) return toast.error("Erro ao registrar pagamento");

    toast.success(isFullyPaid
      ? "Fiado quitado por completo!"
      : `Pagamento de R$ ${value.toFixed(2)} registrado. Restam R$ ${(remaining - value).toFixed(2)}`
    );
    setPartialDialogOpen(false);
    setPartialFiado(null);
    loadFiados(selectedCustomer?.id);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  const totalPending = fiados.reduce((sum, f) => sum + Number(f.amount) - Number(f.paid_amount || 0), 0);

  return (
    <Card className="flex flex-col h-full shadow-card">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Fiados</h2>
          {totalPending > 0 && (
            <Badge variant="destructive">R$ {totalPending.toFixed(2)}</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Voltar ao PDV</Button>
      </div>

      <div className="p-4 space-y-3 border-b border-border">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
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
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do cliente" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <Button className="w-full" onClick={addCustomer} disabled={loading}>
                  {loading ? "Salvando..." : "Cadastrar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Customer chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCustomer(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !selectedCustomer ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            Todos
          </button>
          {filteredCustomers.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCustomer(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCustomer?.id === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Fiado list */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {fiados.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum fiado pendente</p>
        ) : fiados.map(f => {
          const remaining = Number(f.amount) - Number(f.paid_amount || 0);
          const paidPct = Number(f.amount) > 0 ? (Number(f.paid_amount || 0) / Number(f.amount)) * 100 : 0;
          return (
            <div key={f.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{f.customers?.name || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(f.created_at).toLocaleDateString("pt-BR")}
                    {f.notes && ` • ${f.notes}`}
                  </p>
                </div>
                <div className="text-right mx-3">
                  <p className="text-sm font-bold">R$ {remaining.toFixed(2)}</p>
                  {Number(f.paid_amount || 0) > 0 && (
                    <p className="text-xs text-muted-foreground">de R$ {Number(f.amount).toFixed(2)}</p>
                  )}
                </div>
              </div>
              {/* Progress bar */}
              {Number(f.paid_amount || 0) > 0 && (
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(paidPct, 100)}%` }}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openPartialPayment(f)}>
                  <DollarSign className="h-3 w-3" />
                  Pagamento Parcial
                </Button>
                <Button variant="default" size="sm" className="flex-1 gap-1" onClick={() => markAsPaid(f.id)}>
                  <CheckCircle className="h-3 w-3" />
                  Quitar Total
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Partial payment dialog */}
      <Dialog open={partialDialogOpen} onOpenChange={setPartialDialogOpen}>
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
                  <span className="font-semibold">R$ {Number(partialFiado.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Já pago</span>
                  <span>R$ {Number(partialFiado.paid_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1">
                  <span>Restante</span>
                  <span>R$ {(Number(partialFiado.amount) - Number(partialFiado.paid_amount || 0)).toFixed(2)}</span>
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
                  onChange={e => setPartialValue(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <Button className="w-full" onClick={submitPartialPayment}>
                Confirmar Pagamento
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default FiadoPanel;
