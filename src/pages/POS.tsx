import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Minus, ShoppingCart, Trash2, Banknote, CreditCard, Smartphone, BookOpen } from "lucide-react";
import { toast } from "sonner";
import FiadoPanel from "@/components/pos/FiadoPanel";
import CustomerSelectDialog from "@/components/pos/CustomerSelectDialog";

interface Product {
  id: string;
  name: string;
  sale_price: number;
  stock_quantity: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

const paymentMethods = [
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "pix", label: "Pix", icon: Smartphone },
  { value: "credit_card", label: "Crédito", icon: CreditCard },
  { value: "debit_card", label: "Débito", icon: CreditCard },
  { value: "fiado", label: "Fiado", icon: BookOpen },
] as const;

const POS = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<string>("cash");
  const [loading, setLoading] = useState(false);
  const [showFiados, setShowFiados] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("products").select("id, name, sale_price, stock_quantity").eq("is_active", true).order("name");
      if (data) setProducts(data as Product[]);
    };
    load();
  }, []);

  // When fiado is selected, prompt customer selection
  useEffect(() => {
    if (payment === "fiado" && !selectedCustomer) {
      setCustomerDialogOpen(true);
    }
  }, [payment]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          toast.error("Estoque insuficiente");
          return prev;
        }
        return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      if (product.stock_quantity <= 0) {
        toast.error("Produto sem estoque");
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      if (newQty > c.product.stock_quantity) { toast.error("Estoque insuficiente"); return c; }
      return { ...c, quantity: newQty };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, c) => sum + Number(c.product.sale_price) * c.quantity, 0);
  const taxRate = payment === "credit_card" ? 0.03 : payment === "debit_card" ? 0.015 : 0;
  const taxAmount = subtotal * taxRate;
  const total = subtotal - discount + taxAmount;

  const finalizeSale = async () => {
    if (cart.length === 0) return toast.error("Carrinho vazio");
    if (payment === "fiado" && !selectedCustomer) {
      setCustomerDialogOpen(true);
      return toast.error("Selecione um cliente para o fiado");
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return toast.error("Sessão expirada"); }

    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("user_id", user.id).single();
    if (!profile) { setLoading(false); return toast.error("Perfil não encontrado"); }

    const { data: sale, error: saleError } = await supabase.from("sales").insert({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      payment_method: payment,
      subtotal,
      discount,
      tax_amount: taxAmount,
      total,
    }).select("id").single();

    if (saleError || !sale) { setLoading(false); return toast.error("Erro ao registrar venda"); }

    const items = cart.map(c => ({
      sale_id: sale.id,
      product_id: c.product.id,
      tenant_id: profile.tenant_id,
      quantity: c.quantity,
      unit_price: Number(c.product.sale_price),
      total: Number(c.product.sale_price) * c.quantity,
    }));

    const { error: itemsError } = await supabase.from("sale_items").insert(items);
    if (itemsError) { setLoading(false); return toast.error("Erro ao registrar itens"); }

    // Create fiado record if payment is fiado
    if (payment === "fiado" && selectedCustomer) {
      const { error: fiadoError } = await supabase.from("fiados").insert({
        tenant_id: profile.tenant_id,
        customer_id: selectedCustomer.id,
        sale_id: sale.id,
        amount: total,
        notes: `Venda #${sale.id.slice(0, 8)}`,
      });
      if (fiadoError) { setLoading(false); return toast.error("Erro ao registrar fiado"); }
    }

    toast.success(`Venda de R$ ${total.toFixed(2)} finalizada!${payment === "fiado" ? ` (Fiado: ${selectedCustomer?.name})` : ""}`);
    setCart([]);
    setDiscount(0);
    setSelectedCustomer(null);
    if (payment === "fiado") setPayment("cash");
    setLoading(false);

    const { data: updatedProducts } = await supabase.from("products").select("id, name, sale_price, stock_quantity").eq("is_active", true).order("name");
    if (updatedProducts) setProducts(updatedProducts as Product[]);
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  // Show fiado panel
  if (showFiados) {
    return <FiadoPanel onClose={() => setShowFiados(false)} />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)] animate-fade-in">
      {/* Product grid */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" className="gap-2" onClick={() => setShowFiados(true)}>
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Fiados</span>
          </Button>
        </div>
        <div className="flex-1 overflow-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 auto-rows-min">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="p-4 rounded-xl border border-border bg-card shadow-card hover:shadow-glow/20 hover:border-primary/30 transition-all text-left group"
            >
              <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{p.name}</p>
              <p className="text-lg font-bold mt-1">R$ {Number(p.sale_price).toFixed(2)}</p>
              <Badge variant={p.stock_quantity <= 5 ? "destructive" : "secondary"} className="mt-2 text-xs">
                {p.stock_quantity} un
              </Badge>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhum produto encontrado
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <Card className="w-full lg:w-96 flex flex-col shadow-card">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Carrinho</h2>
          <Badge className="ml-auto">{cart.length}</Badge>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-3 min-h-0">
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Adicione produtos ao carrinho</p>
          ) : cart.map(c => (
            <div key={c.product.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.product.name}</p>
                <p className="text-xs text-muted-foreground">R$ {Number(c.product.sale_price).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(c.product.id, -1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">{c.quantity}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(c.product.id, 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm font-semibold w-20 text-right">R$ {(Number(c.product.sale_price) * c.quantity).toFixed(2)}</p>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFromCart(c.product.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {/* Payment */}
        <div className="p-4 border-t border-border space-y-4">
          <div className="grid grid-cols-5 gap-2">
            {paymentMethods.map(m => (
              <button
                key={m.value}
                onClick={() => {
                  setPayment(m.value);
                  if (m.value !== "fiado") setSelectedCustomer(null);
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                  payment === m.value ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-muted"
                }`}
              >
                <m.icon className="h-4 w-4" />
                {m.label}
              </button>
            ))}
          </div>

          {payment === "fiado" && selectedCustomer && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/50 text-sm">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="font-medium">{selectedCustomer.name}</span>
              <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => setCustomerDialogOpen(true)}>
                Trocar
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Desconto R$</Label>
            <Input type="number" step="0.01" min="0" value={discount || ""} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="h-8" />
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-success"><span>Desconto</span><span>-R$ {discount.toFixed(2)}</span></div>}
            {taxAmount > 0 && <div className="flex justify-between text-warning"><span>Taxa ({(taxRate * 100).toFixed(1)}%)</span><span>+R$ {taxAmount.toFixed(2)}</span></div>}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
              <span>Total</span><span>R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={finalizeSale} disabled={loading || cart.length === 0}>
            {loading ? "Processando..." : "Finalizar Venda"}
          </Button>
        </div>
      </Card>

      <CustomerSelectDialog
        open={customerDialogOpen}
        onClose={() => {
          setCustomerDialogOpen(false);
          if (!selectedCustomer) setPayment("cash");
        }}
        onSelect={(customer) => {
          setSelectedCustomer(customer);
          setCustomerDialogOpen(false);
        }}
      />
    </div>
  );
};

export default POS;
