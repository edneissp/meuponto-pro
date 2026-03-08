import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Truck, History, Package, DollarSign, TrendingUp, Edit } from "lucide-react";
import { toast } from "sonner";

interface Supplier { id: string; name: string; }
interface Product { id: string; name: string; sale_price: number; purchase_price: number; stock_quantity: number; }

interface DeliveryItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
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
  supplier_delivery_items?: {
    id: string;
    product_id: string;
    products?: { name: string };
    quantity: number;
    unit_price: number;
    total: number;
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

const SupplierDeliveries = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryRecord | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [purchaseType, setPurchaseType] = useState<"traditional" | "consigned">("traditional");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [suppRes, prodRes, delRes, priceRes] = await Promise.all([
      supabase.from("suppliers").select("id, name").order("name"),
      supabase.from("products").select("id, name, sale_price, purchase_price, stock_quantity").order("name"),
      supabase.from("supplier_deliveries").select("*, supplier_delivery_items(*, products:product_id(name)), suppliers:supplier_id(name)").order("delivery_date", { ascending: false }).limit(50),
      supabase.from("supplier_price_history").select("*, suppliers:supplier_id(name), products:product_id(name)").order("recorded_at", { ascending: false }).limit(100),
    ]);
    if (suppRes.data) setSuppliers(suppRes.data);
    if (prodRes.data) setProducts(prodRes.data);
    if (delRes.data) setDeliveries(delRes.data as any);
    if (priceRes.data) setPriceHistory(priceRes.data as any);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const addItem = () => {
    setItems(prev => [...prev, { product_id: "", product_name: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === "product_id") {
        const prod = products.find(p => p.id === value);
        if (prod) {
          updated.product_name = prod.name;
          updated.unit_price = Number(prod.purchase_price);
          updated.total = updated.quantity * updated.unit_price;
        }
      }
      if (field === "quantity" || field === "unit_price") {
        updated.total = Number(updated.quantity) * Number(updated.unit_price);
      }
      return updated;
    }));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const handleSave = async () => {
    if (!selectedSupplier || items.length === 0 || items.some(i => !i.product_id || i.quantity <= 0)) {
      toast.error("Preencha fornecedor e pelo menos um item válido");
      return;
    }
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Sessão expirada"); setSaving(false); return; }
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("user_id", session.user.id).single();
      if (!profile) { toast.error("Perfil não encontrado"); setSaving(false); return; }
      const tenantId = profile.tenant_id;

      if (editingDelivery) {
        // UPDATE mode
        // 1. Update delivery header
        const { error: delErr } = await supabase.from("supplier_deliveries").update({
          supplier_id: selectedSupplier,
          delivery_date: deliveryDate,
          total_amount: totalAmount,
          purchase_type: purchaseType,
          notes: notes || null,
        }).eq("id", editingDelivery.id);
        if (delErr) throw new Error("Erro ao atualizar entrega");

        // 2. Delete old items and insert new ones
        await supabase.from("supplier_delivery_items").delete().eq("delivery_id", editingDelivery.id);

        const deliveryItems = items.map(item => ({
          delivery_id: editingDelivery.id,
          tenant_id: tenantId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        }));
        const { error: itemsErr } = await supabase.from("supplier_delivery_items").insert(deliveryItems);
        if (itemsErr) throw new Error("Erro ao salvar itens");

        toast.success("Entrega atualizada com sucesso!");
      } else {
        // CREATE mode
        const { data: delivery, error: delErr } = await supabase.from("supplier_deliveries").insert({
          tenant_id: tenantId,
          supplier_id: selectedSupplier,
          delivery_date: deliveryDate,
          total_amount: totalAmount,
          purchase_type: purchaseType,
          notes: notes || null,
        }).select("id").single();

        if (delErr || !delivery) throw new Error("Erro ao criar entrega");

        const deliveryItems = items.map(item => ({
          delivery_id: delivery.id,
          tenant_id: tenantId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        }));
        const { error: itemsErr } = await supabase.from("supplier_delivery_items").insert(deliveryItems);
        if (itemsErr) throw new Error("Erro ao salvar itens");

        // Update stock + record movements + update purchase_price + record price history
        for (const item of items) {
          await supabase.from("products").update({
            stock_quantity: (products.find(p => p.id === item.product_id)?.stock_quantity || 0) + item.quantity,
            purchase_price: item.unit_price,
          }).eq("id", item.product_id);

          await supabase.from("stock_movements").insert({
            tenant_id: tenantId,
            product_id: item.product_id,
            type: "entry",
            quantity: item.quantity,
            notes: `Entrega fornecedor: ${suppliers.find(s => s.id === selectedSupplier)?.name || ""}`,
          });

          await supabase.from("supplier_price_history").insert({
            tenant_id: tenantId,
            supplier_id: selectedSupplier,
            product_id: item.product_id,
            unit_price: item.unit_price,
          });
        }

        if (purchaseType === "traditional") {
          await supabase.from("expenses").insert({
            tenant_id: tenantId,
            description: `Entrega - ${suppliers.find(s => s.id === selectedSupplier)?.name || "Fornecedor"} (${deliveryDate})`,
            amount: totalAmount,
            category: "Compra de Mercadorias",
            supplier_id: selectedSupplier,
            paid: false,
            due_date: deliveryDate,
          });
        }

        toast.success("Entrega registrada com sucesso!");
      }

      setDialogOpen(false);
      resetForm();
      loadData();
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

  const openEdit = (del: DeliveryRecord) => {
    setEditingDelivery(del);
    setSelectedSupplier(del.supplier_id);
    setPurchaseType(del.purchase_type as "traditional" | "consigned");
    setDeliveryDate(del.delivery_date);
    setNotes(del.notes || "");
    setItems(
      (del.supplier_delivery_items || []).map((item: any) => ({
        product_id: item.product_id,
        product_name: item.products?.name || "",
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        total: Number(item.total),
      }))
    );
    setDialogOpen(true);
  };

  const getMarginInfo = (product: Product) => {
    const cost = Number(product.purchase_price);
    const sale = Number(product.sale_price);
    if (cost <= 0 || sale <= 0) return null;
    const margin = ((sale - cost) / sale) * 100;
    return { cost, sale, margin };
  };

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
        <TabsList>
          <TabsTrigger value="deliveries" className="gap-1"><Truck className="h-4 w-4" /> Entregas</TabsTrigger>
          <TabsTrigger value="prices" className="gap-1"><History className="h-4 w-4" /> Histórico de Preços</TabsTrigger>
          <TabsTrigger value="margins" className="gap-1"><TrendingUp className="h-4 w-4" /> Margens</TabsTrigger>
        </TabsList>

        <TabsContent value="deliveries" className="space-y-3 mt-4">
          {deliveries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhuma entrega registrada</div>
          ) : deliveries.map(del => (
            <Card key={del.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="font-bold">{(del.suppliers as any)?.name || "Fornecedor"}</span>
                  <Badge variant={del.purchase_type === "consigned" ? "secondary" : "default"}>
                    {del.purchase_type === "consigned" ? "Consignado" : "Tradicional"}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(del.delivery_date + "T12:00:00").toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="space-y-1 mb-2">
                {del.supplier_delivery_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      <span className="font-bold text-primary mr-1">{item.quantity}x</span>
                      {item.products?.name || "Produto"}
                    </span>
                    <span className="text-muted-foreground">
                      R$ {Number(item.unit_price).toFixed(2)} = R$ {Number(item.total).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-bold">R$ {Number(del.total_amount).toFixed(2)}</span>
              </div>
              {del.notes && <p className="text-xs text-muted-foreground mt-1">Obs: {del.notes}</p>}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="prices" className="mt-4">
          {priceHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhum histórico de preço</div>
          ) : (
            <div className="space-y-2">
              {priceHistory.map(ph => (
                <Card key={ph.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{(ph.products as any)?.name || "Produto"}</p>
                    <p className="text-xs text-muted-foreground">
                      {(ph.suppliers as any)?.name || "Fornecedor"} • {new Date(ph.recorded_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span className="font-bold">R$ {Number(ph.unit_price).toFixed(2)}</span>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="margins" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {products.filter(p => getMarginInfo(p)).map(p => {
              const info = getMarginInfo(p)!;
              return (
                <Card key={p.id} className="p-4">
                  <p className="font-medium text-sm truncate mb-2">{p.name}</p>
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
                      <p className={`font-bold text-sm ${info.margin >= 30 ? "text-green-500" : info.margin >= 15 ? "text-yellow-500" : "text-red-500"}`}>
                        {info.margin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Delivery Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" /> Registrar Entrega
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Fornecedor *</label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tipo de Compra</label>
                <Select value={purchaseType} onValueChange={(v: any) => setPurchaseType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="traditional">Tradicional</SelectItem>
                    <SelectItem value="consigned">Consignado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Data da Entrega</label>
                <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
              </div>
            </div>

            <Input placeholder="Observações (opcional)" value={notes} onChange={e => setNotes(e.target.value)} />

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Itens da Entrega</label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Item
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {index === 0 && <label className="text-xs text-muted-foreground">Produto</label>}
                    <Select value={item.product_id} onValueChange={v => updateItem(index, "product_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <label className="text-xs text-muted-foreground">Qtd</label>}
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <label className="text-xs text-muted-foreground">Preço Unit.</label>}
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unit_price}
                      onChange={e => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <label className="text-xs text-muted-foreground">Total</label>}
                    <Input value={`R$ ${item.total.toFixed(2)}`} disabled />
                  </div>
                  <div className="col-span-1">
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
                {saving ? "Salvando..." : "Registrar Entrega"}
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
