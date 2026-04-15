import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, AlertCircle, CheckCircle2, DollarSign, Eye } from "lucide-react";
import { toast } from "sonner";

const EXPENSE_CATEGORIES = [
  "Mercadoria", "Aluguel", "Energia", "Água", "Internet",
  "Funcionários", "Manutenção", "Marketing", "Embalagens", "Outros",
];

const formatCurrency = (v: number) => `R$ ${Number(v || 0).toFixed(2)}`;

interface Expense {
  id: string;
  description: string;
  amount: number;
  paid_amount: number;
  payment_status: string;
  category: string | null;
  due_date: string | null;
  paid: boolean;
  paid_at: string | null;
  supplier_id: string | null;
  created_at: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface ExpensesTabProps {
  expenses: Expense[];
  suppliers: Supplier[];
  onReload: () => void;
  getTenantId: () => Promise<string | null>;
}

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
  overdue: "Vencido",
  canceled: "Cancelado",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "paid": return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Pago</Badge>;
    case "partial": return <Badge className="bg-yellow-500/90 hover:bg-yellow-500 text-white">Parcial</Badge>;
    case "overdue": return <Badge variant="destructive">Vencido</Badge>;
    case "canceled": return <Badge variant="secondary">Cancelado</Badge>;
    default: return <Badge variant="outline">Pendente</Badge>;
  }
};

const ExpensesTab = ({ expenses, suppliers, onReload, getTenantId }: ExpensesTabProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({ description: "", amount: "", category: "", due_date: "", supplier_id: "", notes: "" });
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payExpense, setPayExpense] = useState<Expense | null>(null);
  const [payValue, setPayValue] = useState("");
  const [payNote, setPayNote] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const resetForm = () => {
    setEditing(null);
    setForm({ description: "", amount: "", category: "", due_date: "", supplier_id: "", notes: "" });
  };

  const handleSave = async () => {
    const tenantId = await getTenantId();
    if (!tenantId) return toast.error("Sessão inválida");
    if (!form.description.trim()) return toast.error("Descrição obrigatória");
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error("Valor inválido");

    const payload = {
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      category: form.category || null,
      due_date: form.due_date || null,
      supplier_id: form.supplier_id || null,
      tenant_id: tenantId,
    };

    if (editing) {
      const { error } = await supabase.from("expenses").update(payload).eq("id", editing.id);
      if (error) return toast.error("Erro ao atualizar");
      toast.success("Despesa atualizada!");
    } else {
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) return toast.error("Erro ao criar despesa");
      toast.success("Despesa registrada!");
    }

    setDialogOpen(false);
    resetForm();
    onReload();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Despesa excluída");
    onReload();
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({
      description: exp.description,
      amount: exp.amount.toString(),
      category: exp.category || "",
      due_date: exp.due_date || "",
      supplier_id: exp.supplier_id || "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const registerPayment = async () => {
    if (!payExpense) return;
    const tenantId = await getTenantId();
    if (!tenantId) return toast.error("Sessão inválida");

    const value = parseFloat(payValue);
    const remaining = Number(payExpense.amount) - Number(payExpense.paid_amount || 0);
    if (!value || value <= 0) return toast.error("Valor inválido");
    if (value > remaining + 0.01) return toast.error(`Máximo: ${formatCurrency(remaining)}`);

    const newPaidAmount = Number((Number(payExpense.paid_amount || 0) + value).toFixed(2));
    const isFullyPaid = newPaidAmount >= Number(payExpense.amount);

    const { error } = await supabase.from("expenses").update({
      paid_amount: newPaidAmount,
      paid: isFullyPaid,
      paid_at: isFullyPaid ? new Date().toISOString() : payExpense.paid_at,
      payment_status: isFullyPaid ? "paid" : "partial",
    }).eq("id", payExpense.id);

    if (error) return toast.error("Erro ao registrar pagamento");
    toast.success(isFullyPaid ? "Despesa quitada!" : `Pagamento de ${formatCurrency(value)} registrado`);
    setPayDialogOpen(false);
    setPayExpense(null);
    setPayValue("");
    setPayNote("");
    onReload();
  };

  const markFullyPaid = async (exp: Expense) => {
    const remaining = Number(exp.amount) - Number(exp.paid_amount || 0);
    if (remaining <= 0) return;

    const { error } = await supabase.from("expenses").update({
      paid_amount: Number(exp.amount),
      paid: true,
      paid_at: new Date().toISOString(),
      payment_status: "paid",
    }).eq("id", exp.id);

    if (error) return toast.error("Erro ao quitar");
    toast.success("Despesa quitada!");
    onReload();
  };

  const cancelExpense = async (exp: Expense) => {
    const { error } = await supabase.from("expenses").update({ payment_status: "canceled" }).eq("id", exp.id);
    if (error) return toast.error("Erro ao cancelar");
    toast.success("Despesa cancelada");
    onReload();
  };

  const filtered = useMemo(() => {
    if (statusFilter === "all") return expenses;
    return expenses.filter(e => e.payment_status === statusFilter);
  }, [expenses, statusFilter]);

  const overdue = expenses.filter(e => e.payment_status === "overdue" || (!e.paid && e.due_date && new Date(e.due_date) < new Date()));
  const totalPending = expenses.filter(e => !e.paid).reduce((s, e) => s + (Number(e.amount) - Number(e.paid_amount || 0)), 0);
  const totalPaid = expenses.filter(e => e.paid).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Pendente</p>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(totalPending)}</p>
        </Card>
        <Card className="p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Pago</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
        </Card>
        <Card className="p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Vencidas</p>
          <p className="text-2xl font-bold text-destructive">{overdue.length} conta(s)</p>
        </Card>
      </div>

      {overdue.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
            {overdue.length} conta(s) vencida(s) — total {formatCurrency(overdue.reduce((s, e) => s + (Number(e.amount) - Number(e.paid_amount || 0)), 0))}
          </div>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="partial">Parcial</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="overdue">Vencido</SelectItem>
            <SelectItem value="canceled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nova Despesa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Descrição *</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$) *</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vencimento</Label>
                  <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
                <div>
                  <Label>Fornecedor</Label>
                  <Select value={form.supplier_id} onValueChange={v => setForm({ ...form, supplier_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSave}>{editing ? "Atualizar" : "Registrar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="hidden sm:table-cell">Categoria</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead className="hidden md:table-cell">Vencimento</TableHead>
              <TableHead className="w-36">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  Nenhuma despesa encontrada
                </TableCell>
              </TableRow>
            ) : filtered.map(exp => {
              const remaining = Number(exp.amount) - Number(exp.paid_amount || 0);
              const isOverdue = !exp.paid && exp.due_date && new Date(exp.due_date) < new Date();
              return (
                <TableRow key={exp.id} className={isOverdue ? "bg-destructive/5" : ""}>
                  <TableCell>{statusBadge(exp.payment_status)}</TableCell>
                  <TableCell className="font-medium">{exp.description}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{exp.category || "—"}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(Number(exp.amount))}</TableCell>
                  <TableCell className="text-emerald-600 font-medium">{formatCurrency(Number(exp.paid_amount || 0))}</TableCell>
                  <TableCell className={remaining > 0 ? "text-destructive font-medium" : ""}>{formatCurrency(remaining)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {exp.due_date ? (
                      <span className={isOverdue ? "font-medium text-destructive" : ""}>
                        {new Date(exp.due_date).toLocaleDateString("pt-BR")}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {exp.payment_status !== "paid" && exp.payment_status !== "canceled" && (
                        <>
                          <Button variant="ghost" size="icon" title="Registrar pagamento" onClick={() => { setPayExpense(exp); setPayValue(""); setPayNote(""); setPayDialogOpen(true); }}>
                            <DollarSign className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Quitar total" onClick={() => markFullyPaid(exp)}>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(exp)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Payment dialog */}
      <Dialog open={payDialogOpen} onOpenChange={o => { setPayDialogOpen(o); if (!o) { setPayExpense(null); setPayValue(""); setPayNote(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          {payExpense && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm font-medium">{payExpense.description}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{formatCurrency(Number(payExpense.amount))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Já pago</span>
                  <span>{formatCurrency(Number(payExpense.paid_amount || 0))}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1">
                  <span>Restante</span>
                  <span>{formatCurrency(Number(payExpense.amount) - Number(payExpense.paid_amount || 0))}</span>
                </div>
              </div>
              <div>
                <Label>Valor do pagamento (R$)</Label>
                <Input type="number" step="0.01" min="0.01" value={payValue} onChange={e => setPayValue(e.target.value)} placeholder="0.00" autoFocus />
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea value={payNote} onChange={e => setPayNote(e.target.value)} rows={2} />
              </div>
              <Button className="w-full" onClick={registerPayment}>Confirmar Pagamento</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpensesTab;
