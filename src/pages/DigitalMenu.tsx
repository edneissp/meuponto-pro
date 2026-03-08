import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingCart, Plus, Minus, Trash2, Search, Send, Store, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";

interface Product {
  id: string;
  name: string;
  description: string | null;
  sale_price: number;
  image_url: string | null;
  category_id: string | null;
  stock_quantity: number;
}

interface Category {
  id: string;
  name: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

interface TenantInfo {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

const DigitalMenu = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      const [tenantRes, productsRes, categoriesRes] = await Promise.all([
        supabase.from("tenants").select("id, name, logo_url, primary_color").eq("id", tenantId).single(),
        supabase.from("products").select("id, name, description, sale_price, image_url, category_id, stock_quantity").eq("tenant_id", tenantId).eq("is_active", true).order("name"),
        supabase.from("categories").select("id, name").eq("tenant_id", tenantId).order("name"),
      ]);
      if (tenantRes.data) setTenant(tenantRes.data as TenantInfo);
      if (productsRes.data) setProducts(productsRes.data as Product[]);
      if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
      setLoading(false);
    };
    load();
  }, [tenantId]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product, quantity: 1, notes: "" }];
    });
    toast.success(`${product.name} adicionado`);
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      return { ...c, quantity: newQty };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + Number(c.product.sale_price) * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const sendOrder = async () => {
    if (!tenantId || cart.length === 0) return;
    setSending(true);

    const { data: order, error: orderError } = await supabase.from("orders").insert({
      tenant_id: tenantId,
      source: "digital_menu",
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      table_number: tableNumber || null,
      subtotal: cartTotal,
      total: cartTotal,
    }).select("id, order_number").single();

    if (orderError || !order) {
      setSending(false);
      toast.error("Erro ao enviar pedido");
      return;
    }

    const items = cart.map(c => ({
      order_id: order.id,
      tenant_id: tenantId,
      product_id: c.product.id,
      product_name: c.product.name,
      quantity: c.quantity,
      unit_price: Number(c.product.sale_price),
      total: Number(c.product.sale_price) * c.quantity,
      notes: c.notes || null,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(items);
    if (itemsError) {
      setSending(false);
      toast.error("Erro ao enviar itens do pedido");
      return;
    }

    setOrderNumber(order.order_number);
    setOrderSent(true);
    setCart([]);
    setCartOpen(false);
    setSending(false);
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !activeCategory || p.category_id === activeCategory;
    return matchSearch && matchCategory;
  });

  const accentColor = tenant?.primary_color || "#F97316";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando cardápio...</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Estabelecimento não encontrado.</p>
      </div>
    );
  }

  if (orderSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <Sonner />
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: accentColor }}>
          <Send className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Pedido Enviado!</h1>
        {orderNumber && (
          <p className="text-4xl font-extrabold mb-4" style={{ color: accentColor }}>
            #{orderNumber}
          </p>
        )}
        <p className="text-muted-foreground mb-6">Seu pedido foi recebido e está sendo preparado.</p>
        <Button onClick={() => { setOrderSent(false); setOrderNumber(null); }} style={{ backgroundColor: accentColor }}>
          Fazer novo pedido
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Sonner />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentColor }}>
              <Store className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg leading-tight">{tenant.name}</h1>
            <p className="text-xs text-muted-foreground">Cardápio Digital</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no cardápio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !activeCategory ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              style={!activeCategory ? { backgroundColor: accentColor } : {}}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat.id ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                style={activeCategory === cat.id ? { backgroundColor: accentColor } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Products */}
        <div className="space-y-3">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:shadow-md transition-all text-left group"
            >
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="h-20 w-20 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Store className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                {p.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.description}</p>
                )}
                <p className="font-bold mt-1" style={{ color: accentColor }}>
                  R$ {Number(p.sale_price).toFixed(2)}
                </p>
              </div>
              <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: accentColor }}>
                <Plus className="h-4 w-4 text-white" />
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum produto encontrado
            </div>
          )}
        </div>
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetTrigger asChild>
            <button
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl text-white font-semibold shadow-xl transition-transform active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Ver carrinho</span>
              <Badge className="bg-white/20 text-white border-0">{cartCount}</Badge>
              <span className="ml-auto font-bold">R$ {cartTotal.toFixed(2)}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" style={{ color: accentColor }} />
                Seu Pedido
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-auto space-y-3 py-4">
              {cart.map(c => (
                <div key={c.product.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.product.name}</p>
                    <p className="text-xs text-muted-foreground">R$ {Number(c.product.sale_price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(c.product.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-bold">{c.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(c.product.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm font-bold w-20 text-right">R$ {(Number(c.product.sale_price) * c.quantity).toFixed(2)}</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFromCart(c.product.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <Input placeholder="Seu nome (opcional)" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              <Input placeholder="Telefone (opcional)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              <Input placeholder="Nº da mesa (opcional)" value={tableNumber} onChange={e => setTableNumber(e.target.value)} />

              <div className="flex justify-between items-center text-lg font-bold pt-2">
                <span>Total</span>
                <span style={{ color: accentColor }}>R$ {cartTotal.toFixed(2)}</span>
              </div>

              <Button
                className="w-full text-white"
                size="lg"
                style={{ backgroundColor: accentColor }}
                onClick={sendOrder}
                disabled={sending || cart.length === 0}
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Enviando..." : "Enviar Pedido"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default DigitalMenu;
