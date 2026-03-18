import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, CreditCard, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import SubscriptionTab from "@/components/finance/SubscriptionTab";
import InvoicesTab from "@/components/finance/InvoicesTab";
import type { Expense, InvoiceRecord, Period, SubscriptionRecord, Supplier, SummaryStats } from "@/components/finance/types";

const EXPENSE_CATEGORIES = [
  "Mercadoria", "Aluguel", "Energia", "Água", "Internet",
  "Funcionários", "Manutenção", "Marketing", "Embalagens", "Outros",
];

const Finance = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [profitData, setProfitData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({ revenue: 0, costs: 0, expenses: 0, profit: 0, margin: 0, pending: 0 });
  const [period, setPeriod] = useState<Period>("daily");

  const [expDialogOpen, setExpDialogOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<Expense | null>(null);
  const [expForm, setExpForm] = useState({
    description: "", amount: "", category: "", due_date: "", supplier_id: "",
  });

  const [supDialogOpen, setSupDialogOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const [supForm, setSupForm] = useState({ name: "", phone: "", email: "", notes: "" });

  const getTenantId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("user_id", user.id).single();
    return profile?.tenant_id || null;
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

    const itemsBySale: Record<string, any[]> = {};
    saleItems.forEach((item) => {
      if (!itemsBySale[item.sale_id]) itemsBySale[item.sale_id] = [];
      itemsBySale[item.sale_id].push(item);
    });

    sales.filter((sale) => new Date(sale.created_at) >= cutoff).forEach((sale) => {
      const key = getKey(new Date(sale.created_at));
      if (!points[key]) points[key] = { revenue: 0, cost: 0, expense: 0 };
      points[key].revenue += Number(sale.total);

      const items = itemsBySale[sale.id] || [];
      items.forEach((item: any) => {
        points[key].cost += Number(item.products?.purchase_price || 0) * item.quantity;
      });
    });

    exps.filter((expense) => expense.paid && new Date(expense.created_at) >= cutoff).forEach((expense) => {
      const key = getKey(new Date(expense.created_at));
      if (!points[key]) points[key] = { revenue: 0, cost: 0, expense: 0 };
      points[key].expense += Number(expense.amount);
    });

    const chartData = Object.entries(points).map(([name, values]) => ({
      name,
      receita: Number(values.revenue.toFixed(2)),
      custo: Number((values.cost + values.expense).toFixed(2)),
      lucro: Number((values.revenue - values.cost - values.expense).toFixed(2)),
    }));

    setProfitData(chartData);
  };

  const loadData = async () => {
    const tenantId = await getTenantId();

    const [expRes, supRes, salesRes, saleItemsRes, subscriptionRes, invoicesRes] = await Promise.all([
      supabase.from("expenses").select("*").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("sales").select("*").eq("status", "completed"),
      supabase.from("sale_items").select("*, products(purchase_price)"),
      tenantId
        ? supabase.from("subscriptions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(1).maybeSingle()
        : Promise.resolve({ data: null, error: null } as any),
      tenantId
        ? supabase.from("invoices").select("*").eq("tenant_id", tenantId).order("due_date", { ascending: false }).limit(20)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    const expData = expRes.data || [];
    const salesData = salesRes.data || [];
    const saleItemsData = saleItemsRes.data || [];

    setExpenses(expData as Expense[]);
    setSuppliers((supRes.data || []) as Supplier[]);
    setSubscription((subscriptionRes.data as SubscriptionRecord | null) || null);
    setInvoices((invoicesRes.data || []) as InvoiceRecord[]);

    const revenue = salesData.reduce((sum, sale) => sum + Number(sale.total), 0);
    const costs = saleItemsData.reduce((sum, item) => {
      const purchasePrice = (item as any).products?.purchase_price || 0;
      return sum + Number(purchasePrice) * item.quantity;
    }, 0);
    const totalExpenses = expData.filter((expense) => expense.paid).reduce((sum, expense) => sum + Number(expense.amount), 0);
    const pending = expData.filter((expense) => !expense.paid).reduce((sum, expense) => sum + Number(expense.amount), 0);
    const profit = revenue - costs - totalExpenses;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    setSummaryStats({ revenue, costs, expenses: totalExpenses, profit, margin, pending });
    buildProfitChart(salesData, saleItemsData, expData as Expense[]);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadData();
  }, [period]);

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

  const togglePaid = async (expense: Expense) => {
    const update = expense.paid
      ? { paid: false, paid_at: null }
      : { paid: true, paid_at: new Date().toISOString() };

    const { error } = await supabase.from("expenses").update(update).eq("id", expense.id);
    if (error) return toast.error("Erro ao atualizar");
    loadData();
  };

  const openEditExpense = (expense: Expense) => {
    setEditingExp(expense);
    setExpForm({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category || "",
      due_date: expense.due_date || "",
      supplier_id: expense.supplier_id || "",
    });
    setExpDialogOpen(true);
  };

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

  const openEditSupplier = (supplier: Supplier) => {
    setEditingSup(supplier);
    setSupForm({
      name: supplier.name,
      phone: supplier.phone || "",
      email: supplier.email || "",
      notes: supplier.notes || "",
    });
    setSupDialogOpen(true);
  };

  const overdue = useMemo(
    () => expenses.filter((expense) => !expense.paid && expense.due_date && new Date(expense.due_date) < new Date()),
    [expenses]
  );

  const statCards = [
    { label: "Receita Total", value: summaryStats.revenue, icon: DollarSign, color: "text-success" },
    { label: "Custos + Despesas", value: summaryStats.costs + summaryStats.expenses, icon: TrendingDown, color: "text-destructive" },
    { label: "Lucro Líquido", value: summaryStats.profit, icon: TrendingUp, color: summaryStats.profit >= 0 ? "text-success" : "text-destructive" },
    { label: "Contas a Pagar", value: summaryStats.pending, icon: AlertCircle, color: "text-warning" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`mt-1 text-2xl font-bold ${stat.color}`}>R$ {stat.value.toFixed(2)}</p>
              </div>
              <div className="h-11 w-11 rounded-lg gradient-primary flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            {stat.label === "Lucro Líquido" && (
              <p className="mt-2 text-xs text-muted-foreground">Margem: {summaryStats.margin.toFixed(1)}%</p>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Lucro por Período</h3>
          <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
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
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(value) => `R$${value}`} />
                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                <Bar dataKey="receita" name="Receita" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="custo" name="Custos" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="lucro" name="Lucro" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Registre vendas e despesas para ver o gráfico de lucro
            </div>
          )}
        </div>
      </Card>

      <Tabs defaultValue="expenses">
        <TabsList className="flex h-auto flex-wrap gap-2 bg-transparent p-0">
          <TabsTrigger value="expenses">Despesas / Contas a Pagar</TabsTrigger>
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Assinatura
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            Faturas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-4 space-y-4">
          {overdue.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4" />
                {overdue.length} conta(s) vencida(s) — total R$ {overdue.reduce((sum, expense) => sum + Number(expense.amount), 0).toFixed(2)}
              </div>
            </Card>
          )}

          <div className="flex justify-end">
            <Dialog open={expDialogOpen} onOpenChange={(open) => { setExpDialogOpen(open); if (!open) resetExpForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Nova Despesa</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingExp ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label>Descrição *</Label>
                    <Input value={expForm.description} onChange={(event) => setExpForm({ ...expForm, description: event.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Valor (R$) *</Label>
                      <Input type="number" step="0.01" value={expForm.amount} onChange={(event) => setExpForm({ ...expForm, amount: event.target.value })} />
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Select value={expForm.category} onValueChange={(value) => setExpForm({ ...expForm, category: value })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Vencimento</Label>
                      <Input type="date" value={expForm.due_date} onChange={(event) => setExpForm({ ...expForm, due_date: event.target.value })} />
                    </div>
                    <div>
                      <Label>Fornecedor</Label>
                      <Select value={expForm.supplier_id} onValueChange={(value) => setExpForm({ ...expForm, supplier_id: value })}>
                        <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
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
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      Nenhuma despesa registrada
                    </TableCell>
                  </TableRow>
                ) : expenses.map((expense) => {
                  const isOverdue = !expense.paid && expense.due_date && new Date(expense.due_date) < new Date();

                  return (
                    <TableRow key={expense.id} className={isOverdue ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => togglePaid(expense)} title={expense.paid ? "Marcar como pendente" : "Marcar como pago"}>
                          {expense.paid ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <AlertCircle className={`h-5 w-5 ${isOverdue ? "text-destructive" : "text-warning"}`} />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{expense.category || "—"}</TableCell>
                      <TableCell className="font-medium">R$ {Number(expense.amount).toFixed(2)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {expense.due_date ? (
                          <span className={isOverdue ? "font-medium text-destructive" : ""}>
                            {new Date(expense.due_date).toLocaleDateString("pt-BR")}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditExpense(expense)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(expense.id)}>
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

        <TabsContent value="suppliers" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={supDialogOpen} onOpenChange={(open) => { setSupDialogOpen(open); if (!open) resetSupForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Novo Fornecedor</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSup ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input value={supForm.name} onChange={(event) => setSupForm({ ...supForm, name: event.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Telefone</Label>
                      <Input value={supForm.phone} onChange={(event) => setSupForm({ ...supForm, phone: event.target.value })} />
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <Input type="email" value={supForm.email} onChange={(event) => setSupForm({ ...supForm, email: event.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Input value={supForm.notes} onChange={(event) => setSupForm({ ...supForm, notes: event.target.value })} />
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
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                      Nenhum fornecedor cadastrado
                    </TableCell>
                  </TableRow>
                ) : suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{supplier.phone || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{supplier.email || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditSupplier(supplier)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSupplier(supplier.id)}>
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

        <TabsContent value="subscription" className="mt-4">
          <SubscriptionTab subscription={subscription} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <InvoicesTab invoices={invoices} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finance;
