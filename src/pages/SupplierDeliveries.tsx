import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertCircle, Plus, Trash2, Truck, History, TrendingUp, Edit, BookOpen, DollarSign, PackageCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  deliveryStatusLabels,
  getDeliveryBadgeVariant,
  getPaymentBadgeVariant,
  paymentStatusLabels,
} from "@/lib/billing";

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sale_price: number;
  purchase_price: number;
  stock_quantity: number;
  expiry_date?: string | null;
}

interface DeliveryItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  expiry_date: string;
}

interface DeliveryRecord {
  id: string;
  supplier_id: string;
  suppliers?: { name: string };
  delivery_date: string;
  total_amount: number;
  purchase_type: string;
  notes: string | null;
  created_at: string;
  delivery_status: string;
  payment_status: string;
  payment_date: string | null;
  expense_id: string | null;
  supplier_delivery_items?: {
    id: string;
    product_id: string;
    products?: { name: string };
    quantity: number;
    unit_price: number;
    total: number;
    expiry_date?: string | null;
  }[];
}

interface PriceHistory {
  id: string;
  supplier_id: string;
  suppliers?: { name: string };
  product_id: string;
  products?: { name: string };
  unit_price: number;
  recorded_at: string;
}

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

interface FiadoRecord {
  id: string;
  amount: number;
  paid_amount: number;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  customers?: { name: string } | null;
}

const SupplierDeliveries = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paidFiados, setPaidFiados] = useState<FiadoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingDeliveryId, setUpdatingDeliveryId] = useState<string | null>(null);
  const [updatingExpenseId, setUpdatingExpenseId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryRecord | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [purchaseType, setPurchaseType] = useState<"traditional" | "consigned">("traditional");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DeliveryItem[]>([]);

  const getTenantId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", session.user.id)
      .single();

    return profile?.tenant_id || null;
  };

  const getSupplierName = (supplierId: string) => suppliers.find((supplier) => supplier.id === supplierId)?.name || "Fornecedor";

  const buildExpensePayload = (tenantId: string, supplierId: string, date: string, amount: number) => ({
    tenant_id: tenantId,
    description: `Entrega - ${getSupplierName(supplierId)} (${date})`,
    amount,
    category: "Compra de Mercadorias",
    supplier_id: supplierId,
    paid: false,
    paid_at: null,
    due_date: date,
  });

  const ensureExpenseForDelivery = async (delivery: DeliveryRecord) => {
    if (delivery.purchase_type !== "traditional") return null;
    if (delivery.expense_id) return delivery.expense_id;

    const tenantId = await getTenantId();
    if (!tenantId) throw new Error("Sessão expirada");

    const { data: existingExpense } = await supabase
      .from("expenses")
      .select("id")
      .eq("supplier_id", delivery.supplier_id)
      .eq("amount", delivery.total_amount)
      .eq("due_date", delivery.delivery_date)
      .eq("category", "Compra de Mercadorias")
      .limit(1)
      .maybeSingle();

    if (existingExpense?.id) {
      await supabase.from("supplier_deliveries").update({ expense_id: existingExpense.id }).eq("id", delivery.id);
      return existingExpense.id;
    }

    const { data: createdExpense, error } = await supabase
      .from("expenses")
      .insert(buildExpensePayload(tenantId, delivery.supplier_id, delivery.delivery_date, delivery.total_amount))
      .select("id")
      .single();

    if (error || !createdExpense) throw new Error("Erro ao vincular despesa da entrega");

    await supabase.from("supplier_deliveries").update({ expense_id: createdExpense.id }).eq("id", delivery.id);
    return createdExpense.id;
  };

  const syncProductExpiry = async (productId: string, expiryDate?: string) => {
    if (!expiryDate) return;
    await supabase.from("products").update({ expiry_date: expiryDate }).eq("id", productId);
  };

  const loadData = async () => {
    setLoading(true);

    const [suppRes, prodRes, delRes, priceRes, expRes, fiadoRes] = await Promise.all([
      supabase.from("suppliers").select("id, name").order("name"),
      supabase.from("products").select("id, name, sale_price, purchase_price, stock_quantity, expiry_date").order("name"),
      supabase
        .from("supplier_deliveries")
        .select("*, supplier_delivery_items(*, products:product_id(name)), suppliers:supplier_id(name)")
        .order("delivery_date", { ascending: false })
        .limit(50),
      supabase
        .from("supplier_price_history")
        .select("*, suppliers:supplier_id(name), products:product_id(name)")
        .order("recorded_at", { ascending: false })
        .limit(100),
      supabase.from("expenses").select("*").order("created_at", { ascending: false }),
      supabase
        .from("fiados")
        .select("*, customers(name)")
        .eq("paid", true)
        .order("paid_at", { ascending: false })
        .limit(50),
    ]);

    if (suppRes.data) setSuppliers(suppRes.data);
    if (prodRes.data) setProducts(prodRes.data as Product[]);
    if (delRes.data) setDeliveries(delRes.data as any);
    if (priceRes.data) setPriceHistory(priceRes.data as any);
    if (expRes.data) setExpenses(expRes.data as Expense[]);
    if (fiadoRes.data) setPaidFiados(fiadoRes.data as FiadoRecord[]);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const addItem = () => {
    setItems((prev) => [...prev, { product_id: "", product_name: "", quantity: 1, unit_price: 0, total: 0, expiry_date: "" }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item, currentIndex) => {
        if (currentIndex !== index) return item;

        const updated = { ...item, [field]: value };

        if (field === "product_id") {
          const product = products.find((entry) => entry.id === value);
          if (product) {
            updated.product_name = product.name;
            updated.unit_price = Number(product.purchase_price);
            updated.total = updated.quantity * updated.unit_price;
            updated.expiry_date = product.expiry_date || "";
          }
        }

        if (field === "quantity" || field === "unit_price") {
          updated.total = Number(updated.quantity) * Number(updated.unit_price);
        }

        return updated;
      })
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);

  const handleSave = async () => {
    if (!selectedSupplier || items.length === 0 || items.some((item) => !item.product_id || item.quantity <= 0)) {
      toast.error("Preencha fornecedor e pelo menos um item válido");
      return;
    }

    setSaving(true);

    try {
      const tenantId = await getTenantId();
      if (!tenantId) throw new Error("Sessão expirada");

      if (editingDelivery) {
        const { error: deliveryError } = await supabase
          .from("supplier_deliveries")
          .update({
            supplier_id: selectedSupplier,
            delivery_date: deliveryDate,
            total_amount: totalAmount,
            purchase_type: purchaseType,
            notes: notes || null,
          })
          .eq("id", editingDelivery.id);

        if (deliveryError) throw new Error("Erro ao atualizar entrega");

        await supabase.from("supplier_delivery_items").delete().eq("delivery_id", editingDelivery.id);

        const deliveryItems = items.map((item) => ({
          delivery_id: editingDelivery.id,
          tenant_id: tenantId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          expiry_date: item.expiry_date || null,
        }));

        const { error: itemsError } = await supabase.from("supplier_delivery_items").insert(deliveryItems);
        if (itemsError) throw new Error("Erro ao salvar itens");

        for (const item of items) {
          await syncProductExpiry(item.product_id, item.expiry_date);
        }

        if (purchaseType === "traditional") {
          const expensePayload = buildExpensePayload(tenantId, selectedSupplier, deliveryDate, totalAmount);
          const expenseId = editingDelivery.expense_id || (await ensureExpenseForDelivery({ ...editingDelivery, supplier_id: selectedSupplier, delivery_date: deliveryDate, total_amount: totalAmount } as DeliveryRecord));

          if (expenseId) {
            await supabase.from("expenses").update({
              description: expensePayload.description,
              amount: expensePayload.amount,
              category: expensePayload.category,
              supplier_id: expensePayload.supplier_id,
              due_date: expensePayload.due_date,
            }).eq("id", expenseId);
          }
        }

        toast.success("Entrega atualizada com sucesso!");
      } else {
        const { data: createdDelivery, error: deliveryError } = await supabase
          .from("supplier_deliveries")
          .insert({
            tenant_id: tenantId,
            supplier_id: selectedSupplier,
            delivery_date: deliveryDate,
            total_amount: totalAmount,
            purchase_type: purchaseType,
            notes: notes || null,
          })
          .select("id")
          .single();

        if (deliveryError || !createdDelivery) throw new Error("Erro ao criar entrega");

        const deliveryItems = items.map((item) => ({
          delivery_id: createdDelivery.id,
          tenant_id: tenantId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          expiry_date: item.expiry_date || null,
        }));

        const { error: itemsError } = await supabase.from("supplier_delivery_items").insert(deliveryItems);
        if (itemsError) throw new Error("Erro ao salvar itens");

        for (const item of items) {
          const { data: currentProduct } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.product_id)
            .single();

          const currentStock = currentProduct?.stock_quantity ?? 0;
          await supabase
            .from("products")
            .update({
              stock_quantity: currentStock + item.quantity,
              purchase_price: item.unit_price,
              expiry_date: item.expiry_date || null,
            })
            .eq("id", item.product_id);

          await supabase.from("stock_movements").insert({
            tenant_id: tenantId,
            product_id: item.product_id,
            type: "entry",
            quantity: item.quantity,
            notes: `Entrega fornecedor: ${getSupplierName(selectedSupplier)}`,
          });

          await supabase.from("supplier_price_history").insert({
            tenant_id: tenantId,
            supplier_id: selectedSupplier,
            product_id: item.product_id,
            unit_price: item.unit_price,
          });
        }

        if (purchaseType === "traditional") {
          const { data: expense, error: expenseError } = await supabase
            .from("expenses")
            .insert(buildExpensePayload(tenantId, selectedSupplier, deliveryDate, totalAmount))
            .select("id")
            .single();

          if (!expenseError && expense?.id) {
            await supabase.from("supplier_deliveries").update({ expense_id: expense.id }).eq("id", createdDelivery.id);
          }
        }

        toast.success("Entrega registrada com sucesso!");
      }

      setDialogOpen(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar entrega");
    }

    setSaving(false);
  };

  const resetForm = () => {
    setEditingDelivery(null);
    setSelectedSupplier("");
    setPurchaseType("traditional");
    setDeliveryDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setItems([]);
  };

  const openEdit = (delivery: DeliveryRecord) => {
    setEditingDelivery(delivery);
    setSelectedSupplier(delivery.supplier_id);
    setPurchaseType(delivery.purchase_type as "traditional" | "consigned");
    setDeliveryDate(delivery.delivery_date);
    setNotes(delivery.notes || "");
    setItems(
      (delivery.supplier_delivery_items || []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.products?.name || "",
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total: Number(item.total),
        expiry_date: item.expiry_date || "",
      }))
    );
    setDialogOpen(true);
  };

  const handleDelete = async (delivery: DeliveryRecord) => {
    if (!confirm(`Excluir entrega de ${(delivery.suppliers as any)?.name || "Fornecedor"} em ${new Date(`${delivery.delivery_date}T12:00:00`).toLocaleDateString("pt-BR")}?`)) return;

    try {
      const tenantId = await getTenantId();
      if (!tenantId) {
        toast.error("Sessão expirada");
        return;
      }

      for (const item of delivery.supplier_delivery_items || []) {
        const { data: currentProduct } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (currentProduct) {
          await supabase
            .from("products")
            .update({
              stock_quantity: Math.max(0, (currentProduct.stock_quantity ?? 0) - item.quantity),
            })
            .eq("id", item.product_id);
        }

        await supabase.from("stock_movements").insert({
          tenant_id: tenantId,
          product_id: item.product_id,
          type: "adjustment",
          quantity: -item.quantity,
          notes: `Exclusão entrega fornecedor: ${(delivery.suppliers as any)?.name || ""}`,
        });
      }

      await supabase.from("supplier_delivery_items").delete().eq("delivery_id", delivery.id);
      const { error } = await supabase.from("supplier_deliveries").delete().eq("id", delivery.id);
      if (error) throw error;

      toast.success("Entrega excluída com sucesso!");
      await loadData();
    } catch (err: any) {
      toast.error(`Erro ao excluir: ${err.message}`);
    }
  };

  const handleDeliveryStatusChange = async (delivery: DeliveryRecord, value: string) => {
    if (value === delivery.delivery_status) return;

    setUpdatingDeliveryId(delivery.id);

    const { error } = await supabase
      .from("supplier_deliveries")
      .update({ delivery_status: value })
      .eq("id", delivery.id);

    if (error) {
      toast.error("Erro ao atualizar status da entrega");
      setUpdatingDeliveryId(null);
      return;
    }

    toast.success("Status da entrega atualizado!");
    await loadData();
    setUpdatingDeliveryId(null);
  };

  const handlePaymentStatusChange = async (delivery: DeliveryRecord, value: string) => {
    if (value === delivery.payment_status) return;

    setUpdatingDeliveryId(delivery.id);

    try {
      const paymentDate = value === "paid" ? new Date().toISOString() : null;

      if (delivery.purchase_type === "traditional") {
        const expenseId = await ensureExpenseForDelivery(delivery);

        if (expenseId) {
          const expenseUpdate = value === "paid"
            ? { paid: true, paid_at: paymentDate }
            : { paid: false, paid_at: null };

          const { error: expenseError } = await supabase.from("expenses").update(expenseUpdate).eq("id", expenseId);
          if (expenseError) throw new Error("Erro ao sincronizar despesa financeira");
        }
      }

      const { error } = await supabase
        .from("supplier_deliveries")
        .update({
          payment_status: value,
          payment_date: paymentDate,
        })
        .eq("id", delivery.id);

      if (error) throw new Error("Erro ao atualizar status do pagamento");

      toast.success("Status de pagamento atualizado!");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar pagamento");
    }

    setUpdatingDeliveryId(null);
  };

  const getMarginInfo = (product: Product) => {
    const cost = Number(product.purchase_price);
    const sale = Number(product.sale_price);
    if (cost <= 0 || sale <= 0) return null;
    const margin = ((sale - cost) / sale) * 100;
    return { cost, sale, margin };
  };

  const toggleExpensePaid = async (expense: Expense) => {
    setUpdatingExpenseId(expense.id);

    const update = expense.paid
      ? { paid: false, paid_at: null }
      : { paid: true, paid_at: new Date().toISOString() };

    const { error } = await supabase.from("expenses").update(update).eq("id", expense.id);
    if (error) {
      toast.error("Erro ao atualizar");
      setUpdatingExpenseId(null);
      return;
    }

    await supabase
      .from("supplier_deliveries")
      .update({
        payment_status: update.paid ? "paid" : "pending",
        payment_date: update.paid ? update.paid_at : null,
      })
      .eq("expense_id", expense.id);

    toast.success(expense.paid ? "Despesa marcada como pendente" : "Despesa marcada como paga");
    await loadData();
    setUpdatingExpenseId(null);
  };

  const pendingExpenses = expenses.filter((expense) => !expense.paid);
  const paidExpenses = expenses.filter((expense) => expense.paid);

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Entregas de Fornecedores</h2>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Entrega
        </Button>
      </div>

      <Tabs defaultValue="deliveries">
        <TabsList className="flex-wrap">
          <TabsTrigger value="deliveries" className="gap-1"><Truck className="h-4 w-4" /> Entregas</TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1"><DollarSign className="h-4 w-4" /> Despesas</TabsTrigger>
          <TabsTrigger value="fiados" className="gap-1"><BookOpen className="h-4 w-4" /> Fiados Recebidos</TabsTrigger>
          <TabsTrigger value="prices" className="gap-1"><History className="h-4 w-4" /> Preços</TabsTrigger>
          <TabsTrigger value="margins" className="gap-1"><TrendingUp className="h-4 w-4" /> Margens</TabsTrigger>
        </TabsList>

        <TabsContent value="deliveries" className="space-y-3 mt-4">
          {deliveries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhuma entrega registrada</div>
          ) : deliveries.map((delivery) => (
            <Card key={delivery.id} className="p-4 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <span className="font-bold truncate">{(delivery.suppliers as any)?.name || "Fornecedor"}</span>
                    <Badge variant={delivery.purchase_type === "consigned" ? "secondary" : "default"}>
                      {delivery.purchase_type === "consigned" ? "Consignado" : "Tradicional"}
                    </Badge>
                    <Badge variant={getDeliveryBadgeVariant(delivery.delivery_status)}>
                      {deliveryStatusLabels[delivery.delivery_status] || delivery.delivery_status}
                    </Badge>
                    <Badge variant={getPaymentBadgeVariant(delivery.payment_status)}>
                      {paymentStatusLabels[delivery.payment_status] || delivery.payment_status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{new Date(`${delivery.delivery_date}T12:00:00`).toLocaleDateString("pt-BR")}</p>
                    {delivery.payment_date && (
                      <p>Pagamento registrado em {new Date(delivery.payment_date).toLocaleDateString("pt-BR")}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 self-end sm:self-start">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(delivery)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(delivery)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <PackageCheck className="h-4 w-4 text-primary" />
                    Status da entrega
                  </div>
                  <Select
                    value={delivery.delivery_status}
                    onValueChange={(value) => handleDeliveryStatusChange(delivery, value)}
                    disabled={updatingDeliveryId === delivery.id}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">Recebida</SelectItem>
                      <SelectItem value="processing">Em processamento</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="canceled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Wallet className="h-4 w-4 text-primary" />
                    Status do pagamento
                  </div>
                  <Select
                    value={delivery.payment_status}
                    onValueChange={(value) => handlePaymentStatusChange(delivery, value)}
                    disabled={updatingDeliveryId === delivery.id}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {delivery.purchase_type === "traditional"
                      ? "Ao marcar como pago, a despesa vinculada é atualizada automaticamente no financeiro."
                      : "Compra consignada: o status é apenas operacional e não gera baixa automática em despesa."}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                {delivery.supplier_delivery_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between gap-3 text-sm">
                    <span>
                      <span className="font-bold text-primary mr-1">{item.quantity}x</span>
                      {item.products?.name || "Produto"}
                      {item.expiry_date && (
                        <span className="ml-2 text-xs text-muted-foreground">• Validade {new Date(`${item.expiry_date}T12:00:00`).toLocaleDateString("pt-BR")}</span>
                      )}
                    </span>
                    <span className="text-muted-foreground text-right">
                      R$ {Number(item.unit_price).toFixed(2)} = R$ {Number(item.total).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-bold">R$ {Number(delivery.total_amount).toFixed(2)}</span>
              </div>

              {delivery.notes && <p className="text-xs text-muted-foreground">Obs: {delivery.notes}</p>}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4 mt-4">
          {pendingExpenses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-warning" /> Pendentes ({pendingExpenses.length})
              </h3>
              <div className="space-y-2">
                {pendingExpenses.map((expense) => (
                  <Card key={expense.id} className="p-3 flex items-center justify-between border-warning/20 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.category || "Sem categoria"} • {new Date(expense.created_at).toLocaleDateString("pt-BR")}
                        {expense.due_date && ` • Venc: ${new Date(`${expense.due_date}T12:00:00`).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">R$ {Number(expense.amount).toFixed(2)}</span>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => toggleExpensePaid(expense)} disabled={updatingExpenseId === expense.id}>
                        <CheckCircle2 className="h-3 w-3" /> Pagar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {paidExpenses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-success" /> Pagas ({paidExpenses.length})
              </h3>
              <div className="space-y-2">
                {paidExpenses.map((expense) => (
                  <Card key={expense.id} className="p-3 flex items-center justify-between opacity-70 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.category || "Sem categoria"} • Pago em {expense.paid_at ? new Date(expense.paid_at).toLocaleDateString("pt-BR") : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-success">R$ {Number(expense.amount).toFixed(2)}</span>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => toggleExpensePaid(expense)} disabled={updatingExpenseId === expense.id}>
                        Desfazer
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {expenses.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Nenhuma despesa registrada</div>
          )}
        </TabsContent>

        <TabsContent value="fiados" className="space-y-3 mt-4">
          {paidFiados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhum fiado recebido ainda</div>
          ) : (
            <>
              <Card className="p-4 bg-success/5 border-success/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Recebido de Fiados</span>
                  <span className="text-lg font-bold text-success">
                    R$ {paidFiados.reduce((sum, fiado) => sum + Number(fiado.paid_amount || fiado.amount), 0).toFixed(2)}
                  </span>
                </div>
              </Card>
              <div className="space-y-2">
                {paidFiados.map((fiado) => (
                  <Card key={fiado.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fiado.customers?.name || "Cliente"}</p>
                      <p className="text-xs text-muted-foreground">
                        {fiado.notes || "Fiado"} • Pago em {fiado.paid_at ? new Date(fiado.paid_at).toLocaleDateString("pt-BR") : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-success">R$ {Number(fiado.paid_amount || fiado.amount).toFixed(2)}</span>
                      {Number(fiado.paid_amount) !== Number(fiado.amount) && (
                        <p className="text-xs text-muted-foreground">de R$ {Number(fiado.amount).toFixed(2)}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="prices" className="mt-4">
          {priceHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhum histórico de preço</div>
          ) : (
            <div className="space-y-2">
              {priceHistory.map((price) => (
                <Card key={price.id} className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{(price.products as any)?.name || "Produto"}</p>
                    <p className="text-xs text-muted-foreground">
                      {(price.suppliers as any)?.name || "Fornecedor"} • {new Date(price.recorded_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span className="font-bold">R$ {Number(price.unit_price).toFixed(2)}</span>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="margins" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {products.filter((product) => getMarginInfo(product)).map((product) => {
              const info = getMarginInfo(product)!;
              const marginColor = info.margin >= 30 ? "text-success" : info.margin >= 15 ? "text-warning" : "text-destructive";

              return (
                <Card key={product.id} className="p-4">
                  <p className="font-medium text-sm truncate mb-2">{product.name}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Compra</p>
                      <p className="font-bold text-sm">R$ {info.cost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Venda</p>
                      <p className="font-bold text-sm">R$ {info.sale.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Margem</p>
                      <p className={`font-bold text-sm ${marginColor}`}>{info.margin.toFixed(1)}%</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" /> {editingDelivery ? "Editar Entrega" : "Registrar Entrega"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Fornecedor *</label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tipo de Compra</label>
                <Select value={purchaseType} onValueChange={(value: any) => setPurchaseType(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="traditional">Tradicional</SelectItem>
                    <SelectItem value="consigned">Consignado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Data da Entrega</label>
                <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </div>
            </div>

            <Input placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Itens da Entrega</label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Item
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 md:col-span-4">
                    {index === 0 && <label className="text-xs text-muted-foreground">Produto</label>}
                    <Select value={item.product_id} onValueChange={(value) => updateItem(index, "product_id", value)}>
                      <SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    {index === 0 && <label className="text-xs text-muted-foreground">Qtd</label>}
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    {index === 0 && <label className="text-xs text-muted-foreground">Preço Unit.</label>}
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    {index === 0 && <label className="text-xs text-muted-foreground">Validade</label>}
                    <Input
                      type="date"
                      value={item.expiry_date}
                      onChange={(e) => updateItem(index, "expiry_date", e.target.value)}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-1">
                    {index === 0 && <label className="text-xs text-muted-foreground">Total</label>}
                    <Input value={`R$ ${item.total.toFixed(2)}`} disabled />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    {index === 0 && <label className="text-xs text-muted-foreground">&nbsp;</label>}
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                  Clique em "Adicionar Item" para começar
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-medium">Total da Entrega</span>
                <span className="text-xl font-bold text-primary">R$ {totalAmount.toFixed(2)}</span>
              </div>
            )}

            {purchaseType === "consigned" && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                ⚠️ Compra consignada: estoque será atualizado mas nenhuma despesa será gerada automaticamente. O pagamento ocorre após a venda.
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Salvando..." : editingDelivery ? "Atualizar Entrega" : "Registrar Entrega"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierDeliveries;
