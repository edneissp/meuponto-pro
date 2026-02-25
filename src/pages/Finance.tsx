import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { toast } from "sonner";

interface Expense {
  id: string;
  description: string;
  amount: number;
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
  phone: string | null;
  email: string | null;
  notes: string | null;
}

type Period = "daily" | "weekly" | "monthly";

const EXPENSE_CATEGORIES = [
  "Mercadoria", "Aluguel", "Energia", "Água", "Internet",
  "Funcionários", "Manutenção", "Marketing", "Embalagens", "Outros",
];

const Finance = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [profitData, setProfitData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState({ revenue: 0, costs: 0, expenses: 0, profit: 0, margin: 0, pending: 0 });
  const [period, setPeriod] = useState<Period>("daily");

  // Expense dialog
  const [expDialogOpen, setExpDialogOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Expense | null>(null);
  const [expForm, setExpForm] = useState({
    description: "", amount: "", category: "", due_date: "", supplier_id: "",
  });

  // Supplier dialog
  const [supDialogOpen, setSupDialogOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const [supForm, setSupForm] = useState({ name: "", phone: "", email: "", notes: "" });

  const getTenantId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("user_id", user.id).single();
    return profile?.tenant_id || null;
  };

  const loadData = async () => {
    const [{ data: expData }, { data: supData }, { data: salesData }, { data: saleItemsData }] = await Promise.all([
      supabase.from("expenses").select("*").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("sales").select("*").eq("status", "completed"),
      supabase.from("sale_items").select("*, products(purchase_price)"),
    ]);

    if (expData) setExpenses(expData as Expense[]);
    if (supData) setSuppliers(supData as Supplier[]);

    // Calculate summary
    const revenue = (salesData || []).reduce((s, sale) => s + Number(sale.total), 0);
    const costs = (saleItemsData || []).reduce((s, item) => {
      const purchasePrice = (item as any).products?.purchase_price || 0;
      return s + Number(purchasePrice) * item.quantity;
    }, 0);
    const totalExpenses = (expData || []).filter(e => e.paid).reduce((s, e) => s + Number(e.amount), 0);
    const pending = (expData || []).filter(e => !e.paid).reduce((s, e) => s + Number(e.amount), 0);
    const profit = revenue - costs - totalExpenses;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    setSummaryStats({ revenue, costs, expenses: totalExpenses, profit, margin, pending });

    // Build profit over time
    buildProfitChart(salesData || [], saleItemsData || [], expData || []);
  };

  const buildProfitChart = (sales: any[], saleItems: any[], exps: Expense[]) => {
    const now = new Date();
    const points: Record<string, { revenue: number; cost: number; expense: number }> = {};

    const getKey = (date: Date) => {
      if (period === "daily") return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (period === "weekly") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `Sem ${weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
      }
      return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    };

    const daysBack = period === "daily" ? 14 : period === "weekly" ? 56 : 180;
    const cutoff = new Date(now.getTime() - daysBack * 86400000);

    // Build sale items lookup by sale_id
    const itemsBySale: Record<string, any[]> = {};
    saleItems.forEach(item => {
      if (!itemsBySale[item.sale_id]) itemsBySale[item.sale_id] = [];
      itemsBySale[item.sale_id].push(item);
    });

    sales.filter(s => new Date(s.created_at) >= cutoff).forEach(sale => {
      const key = getKey(new Date(sale.created_at));
      if (!points[key]) points[key] = { revenue: 0, cost: 0, expense: 0 };
      points[key].revenue += Number(sale.total);
      const items = itemsBySale[sale.id] || [];
      items.forEach((item: any) => {
        points[key].cost += Number(item.products?.purchase_price || 0) * item.quantity;
      });
    });

    exps.filter(e => e.paid && new Date(e.created_at) >= cutoff).forEach(exp => {
      const key = getKey(new Date(exp.created_at));
      if (!points[key]) points[key] = { revenue: 0, cost: 0, expense: 0 };
      points[key].expense += Number(exp.amount);
    });

    const chartData = Object.entries(points).map(([name, d]) => ({
      name,
      receita: Number(d.revenue.toFixed(2)),
      custo: Number((d.cost + d.expense).toFixed(2)),
      lucro: Number((d.revenue - d.cost - d.expense).toFixed(2)),
    }));

    setProfitData(chartData);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadData(); }, [period]);

  // ── Expense CRUD ──
  const resetExpForm = () => {
    setEditingExp(null);
    setExpForm({ description: "", amount: "", category: "", due_date: "", supplier_id: "" });
  };

  const handleSaveExpense = async () => {
    const tenantId = await getTenantId();
    if (!tenantId) return toast.error("Sessão inválida");
    if (!expForm.description.trim()) return toast.error("Descrição obrigatória");
    if (!expForm.amount || parseFloat(expForm.amount) <= 0) return toast.error("Valor inválido");

    const payload = {
      description: expForm.description.trim(),
      amount: parseFloat(expForm.amount),
      category: expForm.category || null,
      due_date: expForm.due_date || null,
      supplier_id: expForm.supplier_id || null,
      tenant_id: tenantId,
    };

    if (editingExp) {
      const { error } = await supabase.from("expenses").update(payload).eq("id", editingExp.id);
      if (error) return toast.error("Erro ao atualizar");
      toast.success("Despesa atualizada!");
    } else {
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) return toast.error("Erro ao criar despesa");
      toast.success("Despesa registrada!");
    }
    setExpDialogOpen(false);
    resetExpForm();
    loadData();
  };

  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Despesa excluída");
    loadData();
  };

  const togglePaid = async (exp: Expense) => {
    const update = exp.paid
      ? { paid: false, paid_at: null }
      : { paid: true, paid_at: new Date().toISOString() };
    const { error } = await supabase.from("expenses").update(update).eq("id", exp.id);
    if (error) return toast.error("Erro ao atualizar");
    loadData();
  };

  const openEditExpense = (e: Expense) => {
    setEditingExp(e);
    setExpForm({
      description: e.description,
      amount: e.amount.toString(),
      category: e.category || "",
      due_date: e.due_date || "",
      supplier_id: e.supplier_id || "",
    });
    setExpDialogOpen(true);
  };

  // ── Supplier CRUD ──
  const resetSupForm = () => {
    setEditingSup(null);
    setSupForm({ name: "", phone: "", email: "", notes: "" });
  };

  const handleSaveSupplier = async () => {
    const tenantId = await getTenantId();
    if (!tenantId) return toast.error("Sessão inválida");
    if (!supForm.name.trim()) return toast.error("Nome obrigatório");

    const payload = {
      name: supForm.name.trim(),
      phone: supForm.phone || null,
      email: supForm.email || null,
      notes: supForm.notes || null,
      tenant_id: tenantId,
    };

    if (editingSup) {
      const { error } = await supabase.from("suppliers").update(payload).eq("id", editingSup.id);
      if (error) return toast.error("Erro ao atualizar");
      toast.success("Fornecedor atualizado!");
    } else {
      const { error } = await supabase.from("suppliers").insert(payload);
      if (error) return toast.error("Erro ao criar");
      toast.success("Fornecedor cadastrado!");
    }
    setSupDialogOpen(false);
    resetSupForm();
    loadData();
  };

  const handleDeleteSupplier = async (id: string) => {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Fornecedor excluído");
    loadData();
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSup(s);
    setSupForm({ name: s.name, phone: s.phone || "", email: s.email || "", notes: s.notes || "" });
    setSupDialogOpen(true);
  };

  const overdue = expenses.filter(e => !e.paid && e.due_date && new Date(e.due_date) < new Date());

  const statCards = [
    { label: "Receita Total", value: summaryStats.revenue, icon: DollarSign, color: "text-success" },
    { label: "Custos + Despesas", value: summaryStats.costs + summaryStats.expenses, icon: TrendingDown, color: "text-destructive" },
    { label: "Lucro Líquido", value: summaryStats.profit, icon: TrendingUp, color: summaryStats.profit >= 0 ? "text-success" : "text-destructive" },
    { label: "Contas a Pagar", value: summaryStats.pending, icon: AlertCircle, color: "text-warning" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <Card key={i} className="p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>R$ {s.value.toFixed(2)}</p>
              </div>
              <div className="h-11 w-11 rounded-lg gradient-primary flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            {s.label === "Lucro Líquido" && (
              <p className="text-xs text-muted-foreground mt-2">
                Margem: {summaryStats.margin.toFixed(1)}%
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Profit Chart */}
      <Card className="p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Lucro por Período</h3>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="h-72">
          {profitData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `R$${v}`} />
                <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                <Bar dataKey="receita" name="Receita" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="custo" name="Custos" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="lucro" name="Lucro" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Registre vendas e despesas para ver o gráfico de lucro
            </div>
          )}
        </div>
      </Card>

      {/* Tabs: Despesas / Fornecedores */}
      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">Despesas / Contas a Pagar</TabsTrigger>
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
        </TabsList>

        {/* ── Expenses Tab ── */}
        <TabsContent value="expenses" className="space-y-4 mt-4">
          {overdue.length > 0 && (
            <Card className="p-4 border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                <AlertCircle className="h-4 w-4" />
                {overdue.length} conta(s) vencida(s) — total R$ {overdue.reduce((s, e) => s + Number(e.amount), 0).toFixed(2)}
              </div>
            </Card>
          )}

          <div className="flex justify-end">
            <Dialog open={expDialogOpen} onOpenChange={(o) => { setExpDialogOpen(o); if (!o) resetExpForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Nova Despesa</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingExp ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label>Descrição *</Label>
                    <Input value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Valor (R$) *</Label>
                      <Input type="number" step="0.01" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} />
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Select value={expForm.category} onValueChange={v => setExpForm({ ...expForm, category: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Vencimento</Label>
                      <Input type="date" value={expForm.due_date} onChange={e => setExpForm({ ...expForm, due_date: e.target.value })} />
                    </div>
                    <div>
                      <Label>Fornecedor</Label>
                      <Select value={expForm.supplier_id} onValueChange={v => setExpForm({ ...expForm, supplier_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                        <SelectContent>
                          {suppliers.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleSaveExpense}>{editingExp ? "Atualizar" : "Registrar"}</Button>
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
                  <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                  <TableHead className="w-28">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      Nenhuma despesa registrada
                    </TableCell>
                  </TableRow>
                ) : expenses.map(exp => {
                  const isOverdue = !exp.paid && exp.due_date && new Date(exp.due_date) < new Date();
                  return (
                    <TableRow key={exp.id} className={isOverdue ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => togglePaid(exp)} title={exp.paid ? "Marcar como pendente" : "Marcar como pago"}>
                          {exp.paid ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <AlertCircle className={`h-5 w-5 ${isOverdue ? "text-destructive" : "text-warning"}`} />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{exp.description}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{exp.category || "—"}</TableCell>
                      <TableCell className="font-medium">R$ {Number(exp.amount).toFixed(2)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {exp.due_date ? (
                          <span className={isOverdue ? "text-destructive font-medium" : ""}>
                            {new Date(exp.due_date).toLocaleDateString("pt-BR")}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditExpense(exp)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(exp.id)}>
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
        </TabsContent>

        {/* ── Suppliers Tab ── */}
        <TabsContent value="suppliers" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={supDialogOpen} onOpenChange={(o) => { setSupDialogOpen(o); if (!o) resetSupForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Novo Fornecedor</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSup ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input value={supForm.name} onChange={e => setSupForm({ ...supForm, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Telefone</Label>
                      <Input value={supForm.phone} onChange={e => setSupForm({ ...supForm, phone: e.target.value })} />
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <Input type="email" value={supForm.email} onChange={e => setSupForm({ ...supForm, email: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Input value={supForm.notes} onChange={e => setSupForm({ ...supForm, notes: e.target.value })} />
                  </div>
                  <Button onClick={handleSaveSupplier}>{editingSup ? "Atualizar" : "Cadastrar"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                  <TableHead className="hidden md:table-cell">E-mail</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      Nenhum fornecedor cadastrado
                    </TableCell>
                  </TableRow>
                ) : suppliers.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{s.phone || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{s.email || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditSupplier(s)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSupplier(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finance;
