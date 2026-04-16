import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Minus,
  Search,
  Trash2,
  CheckCircle,
  Printer,
  ArrowRightLeft,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import OrderReceipt from "@/components/pos/OrderReceipt";
import TableClosingDialog from "@/components/tables/TableClosingDialog";

interface Product {
  id: string;
  name: string;
  sale_price: number;
  stock_quantity: number;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes: string | null;
}

interface ActiveOrder {
  id: string;
  order_number: number;
  total: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
}

interface TableData {
  id: string;
  tenant_id: string;
  table_number: number;
  table_name: string | null;
  capacity: number;
  status: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Props {
  table: TableData;
  activeOrder: ActiveOrder | null;
  onBack: () => void;
  onCloseTable: () => void;
}

const TableOrderPanel = ({ table, activeOrder: initialOrder, onBack, onCloseTable }: Props) => {
  const { tenantId, userId } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(initialOrder);
  const [loading, setLoading] = useState(false);
  const [printOrder, setPrintOrder] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [availableTables, setAvailableTables] = useState<TableData[]>([]);
  const [transferring, setTransferring] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("products")
      .select("id, name, sale_price, stock_quantity")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");
    if (data) setProducts(data);
  }, [tenantId]);

  const refreshOrder = useCallback(async () => {
    if (!tenantId || !table.id) return;
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("tenant_id", tenantId)
      .eq("table_id", table.id)
      .in("status", ["received", "preparing", "ready"])
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setActiveOrder(data[0] as any);
    } else {
      setActiveOrder(null);
    }
  }, [tenantId, table.id]);

  useEffect(() => {
    loadProducts();
    refreshOrder();
  }, [loadProducts, refreshOrder]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(c => c.product.id === productId ? { ...c, quantity: c.quantity + delta } : c)
        .filter(c => c.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.product.sale_price * c.quantity, 0);

  const handleSendOrder = async () => {
    if (!tenantId || cart.length === 0) return;
    setLoading(true);

    if (activeOrder) {
      // Add items to existing order
      const items = cart.map(c => ({
        order_id: activeOrder.id,
        tenant_id: tenantId,
        product_id: c.product.id,
        product_name: c.product.name,
        quantity: c.quantity,
        unit_price: c.product.sale_price,
        total: c.product.sale_price * c.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(items);
      if (itemsError) {
        toast.error("Erro ao adicionar itens: " + itemsError.message);
        setLoading(false);
        return;
      }

      // Update order total
      const newTotal = Number(activeOrder.total) + cartTotal;
      await supabase
        .from("orders")
        .update({ total: newTotal, subtotal: newTotal })
        .eq("id", activeOrder.id);

      toast.success(`${cart.length} item(ns) adicionado(s) ao pedido #${activeOrder.order_number}`);
    } else {
      // Create new order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          tenant_id: tenantId,
          table_id: table.id,
          table_number: String(table.table_number),
          source: "waiter",
          status: "received",
          subtotal: cartTotal,
          total: cartTotal,
        })
        .select()
        .single();

      if (orderError || !orderData) {
        toast.error("Erro ao criar pedido: " + (orderError?.message || ""));
        setLoading(false);
        return;
      }

      const items = cart.map(c => ({
        order_id: orderData.id,
        tenant_id: tenantId,
        product_id: c.product.id,
        product_name: c.product.name,
        quantity: c.quantity,
        unit_price: c.product.sale_price,
        total: c.product.sale_price * c.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(items);
      if (itemsError) {
        toast.error("Erro ao adicionar itens: " + itemsError.message);
        setLoading(false);
        return;
      }

      // Mark table as occupied
      await supabase.from("tables").update({ status: "occupied" }).eq("id", table.id);

      toast.success(`Pedido #${orderData.order_number} criado para Mesa ${table.table_number}`);
    }

    setCart([]);
    setLoading(false);
    await refreshOrder();
  };

  const handleCloseAndPay = () => {
    onCloseTable();
  };

  const openTransferDialog = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("tables")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("status", ["available", "reserved"])
      .neq("id", table.id)
      .order("table_number");
    setAvailableTables((data || []) as TableData[]);
    setTransferOpen(true);
  };

  const handleTransfer = async (targetTable: TableData) => {
    if (!activeOrder || !tenantId) return;
    setTransferring(true);

    // Update order to point to new table
    const { error } = await supabase
      .from("orders")
      .update({ table_id: targetTable.id, table_number: String(targetTable.table_number) })
      .eq("id", activeOrder.id);

    if (error) {
      toast.error("Erro ao transferir: " + error.message);
      setTransferring(false);
      return;
    }

    // Mark new table as occupied, old table as available
    await Promise.all([
      supabase.from("tables").update({ status: "occupied" }).eq("id", targetTable.id),
      supabase.from("tables").update({ status: "available" }).eq("id", table.id),
    ]);

    toast.success(`Pedido #${activeOrder.order_number} transferido para Mesa ${targetTable.table_number}`);
    setTransferring(false);
    setTransferOpen(false);
    onBack();
  };

  const orderTotal = activeOrder ? Number(activeOrder.total) : 0;

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">
            Mesa {table.table_number}
            {table.table_name && <span className="text-muted-foreground font-normal text-sm ml-2">({table.table_name})</span>}
          </h2>
        </div>
        {activeOrder && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={openTransferDialog}>
              <ArrowRightLeft className="h-4 w-4 mr-1" /> Transferir
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPrintOrder(true)}>
              <Printer className="h-4 w-4 mr-1" /> Comanda
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleCloseAndPay}
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Fechar Mesa
            </Button>
          </div>
        )}
      </div>

      {/* Active order summary */}
      {activeOrder && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">Pedido #{activeOrder.order_number}</h3>
            <Badge variant="outline">COM-{String(activeOrder.order_number).padStart(4, "0")}</Badge>
          </div>
          <div className="space-y-1 max-h-48 overflow-auto">
            {activeOrder.order_items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  <span className="font-bold text-primary mr-1">{item.quantity}x</span>
                  {item.product_name}
                </span>
                <span className="text-muted-foreground">R$ {Number(item.total).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-2 mt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">Total do Pedido</span>
            <span className="text-lg font-bold">R$ {orderTotal.toFixed(2)}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Products */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-auto">
            {filteredProducts.map(product => (
              <Card
                key={product.id}
                className="p-3 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={() => addToCart(product)}
              >
                <p className="font-medium text-sm truncate">{product.name}</p>
                <p className="text-primary font-bold text-sm">R$ {product.sale_price.toFixed(2)}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart */}
        <Card className="p-4 space-y-3">
          <h3 className="font-bold text-sm">
            {activeOrder ? "Adicionar itens" : "Novo Pedido"}
          </h3>
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Clique nos produtos para adicionar
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-auto">
              {cart.map(c => (
                <div key={c.product.id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{c.product.name}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCartQty(c.product.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center font-bold">{c.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCartQty(c.product.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => updateCartQty(c.product.id, -c.quantity)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="w-20 text-right font-medium">
                    R$ {(c.product.sale_price * c.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {cart.length > 0 && (
            <>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="font-medium text-sm">Subtotal</span>
                <span className="font-bold">R$ {cartTotal.toFixed(2)}</span>
              </div>
              <Button
                className="w-full"
                onClick={handleSendOrder}
                disabled={loading}
              >
                {loading
                  ? "Enviando..."
                  : activeOrder
                  ? `Adicionar ao Pedido #${activeOrder.order_number}`
                  : "Criar Pedido"
                }
              </Button>
            </>
          )}
        </Card>
      </div>

      {/* Print */}
      {activeOrder && (
        <OrderReceipt
          open={printOrder}
          onClose={() => setPrintOrder(false)}
          data={printOrder ? {
            order_number: activeOrder.order_number,
            source: "waiter",
            customer_name: null,
            customer_phone: null,
            table_number: String(table.table_number),
            total: activeOrder.total,
            notes: null,
            created_at: activeOrder.created_at,
            items: activeOrder.order_items.map(i => ({
              product_name: i.product_name,
              quantity: i.quantity,
              unit_price: i.unit_price,
              total: i.total,
              notes: i.notes,
            })),
          } : null}
        />
      )}

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Pedido #{activeOrder?.order_number} para outra mesa</DialogTitle>
          </DialogHeader>
          {availableTables.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma mesa disponível para transferência.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-auto">
              {availableTables.map(t => (
                <Card
                  key={t.id}
                  className="p-3 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={() => handleTransfer(t)}
                >
                  <p className="font-bold">Mesa {t.table_number}</p>
                  {t.table_name && <p className="text-xs text-muted-foreground truncate">{t.table_name}</p>}
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5 mt-1">
                    <Users className="h-3 w-3" /> {t.capacity}
                  </span>
                </Card>
              ))}
            </div>
          )}
          {transferring && <p className="text-sm text-center text-muted-foreground">Transferindo...</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TableOrderPanel;
