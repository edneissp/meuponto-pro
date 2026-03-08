import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Plus, Minus, Trash2, Search, Send, Store, MapPin, UtensilsCrossed, Package, MessageSquare, ChevronLeft, CheckCircle2 } from "lucide-react";
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
  delivery_fee: number;
  free_delivery_radius_km: number;
  delivery_fee_per_km: number;
  store_lat: number | null;
  store_lng: number | null;
  whatsapp: string | null;
}

type OrderType = "table" | "pickup" | "delivery";

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
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("table");
  const [cartOpen, setCartOpen] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [orderTotal, setOrderTotal] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productNotes, setProductNotes] = useState("");
  const [productQty, setProductQty] = useState(1);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "info">("cart");
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      const [tenantRes, productsRes, categoriesRes] = await Promise.all([
        supabase.from("tenants").select("id, name, logo_url, primary_color, delivery_fee, whatsapp, free_delivery_radius_km, delivery_fee_per_km, store_lat, store_lng").eq("id", tenantId).single(),
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

  const addToCart = (product: Product, qty: number = 1, notes: string = "") => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        return prev.map(c =>
          c.product.id === product.id
            ? { ...c, quantity: c.quantity + qty, notes: notes || c.notes }
            : c
        );
      }
      return [...prev, { product, quantity: qty, notes }];
    });
    toast.success(`${product.name} adicionado ao carrinho`);
  };

  const openProductDetail = (product: Product) => {
    setSelectedProduct(product);
    setProductQty(1);
    setProductNotes("");
  };

  const confirmAddProduct = () => {
    if (!selectedProduct) return;
    addToCart(selectedProduct, productQty, productNotes);
    setSelectedProduct(null);
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      return { ...c, quantity: newQty };
    }));
  };

  const updateItemNotes = (productId: string, notes: string) => {
    setCart(prev => prev.map(c =>
      c.product.id === productId ? { ...c, notes } : c
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  };

  const cartSubtotal = cart.reduce((sum, c) => sum + Number(c.product.sale_price) * c.quantity, 0);
  // Haversine distance calculation
  const calcDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const calcDeliveryFee = (): number => {
    if (orderType !== "delivery") return 0;
    if (distanceKm !== null && tenant?.store_lat && tenant?.store_lng) {
      const freeRadius = Number(tenant.free_delivery_radius_km || 1);
      const perKm = Number(tenant.delivery_fee_per_km || 2);
      if (distanceKm <= freeRadius) return 0;
      return Math.round((distanceKm - freeRadius) * perKm * 100) / 100;
    }
    return Number(tenant?.delivery_fee || 0);
  };

  const deliveryFee = calcDeliveryFee();
  const cartTotal = cartSubtotal + deliveryFee;
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const getCustomerLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada pelo navegador");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCustomerLat(lat);
        setCustomerLng(lng);
        if (tenant?.store_lat && tenant?.store_lng) {
          const dist = calcDistanceKm(tenant.store_lat, tenant.store_lng, lat, lng);
          setDistanceKm(Math.round(dist * 10) / 10);
        }
        setGettingLocation(false);
      },
      () => {
        setGettingLocation(false);
        toast.error("Não foi possível obter sua localização");
      },
      { enableHighAccuracy: true }
    );
  };

  const buildOrderNotes = () => {
    const parts: string[] = [];
    if (orderType === "delivery" && deliveryAddress) parts.push(`Entrega: ${deliveryAddress}`);
    if (orderType === "pickup") parts.push("Retirada no balcão");
    if (orderType === "table" && tableNumber) parts.push(`Mesa: ${tableNumber}`);
    return parts.join(" | ") || null;
  };

  const sendOrder = async () => {
    if (!tenantId || cart.length === 0) return;

    if (orderType === "delivery" && !customerName) {
      toast.error("Informe seu nome para delivery");
      return;
    }
    if (orderType === "delivery" && !deliveryAddress) {
      toast.error("Informe o endereço de entrega");
      return;
    }

    setSending(true);

    const { data: order, error: orderError } = await supabase.from("orders").insert({
      tenant_id: tenantId,
      source: orderType === "delivery" ? "delivery" : "digital_menu",
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      table_number: orderType === "table" ? (tableNumber || null) : null,
      notes: buildOrderNotes(),
      subtotal: cartSubtotal,
      discount: 0,
      total: cartTotal,
    }).select("id, order_number").single();

    if (orderError || !order) {
      console.error("Order insert error:", orderError);
      setSending(false);
      toast.error("Erro ao enviar pedido. Tente novamente.");
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
    setOrderTotal(cartTotal);
    setOrderSent(true);
    setCart([]);
    setCartOpen(false);
    setCheckoutStep("cart");
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
    const buildWhatsAppMessage = () => {
      let msg = `🛒 *Novo Pedido #${orderNumber}*\n`;
      msg += `📍 ${tenant.name}\n\n`;
      if (customerName) msg += `👤 ${customerName}\n`;
      if (customerPhone) msg += `📱 ${customerPhone}\n`;
      if (orderType === "table" && tableNumber) msg += `🪑 Mesa: ${tableNumber}\n`;
      if (orderType === "pickup") msg += `📦 Retirada no balcão\n`;
      if (orderType === "delivery" && deliveryAddress) msg += `🛵 Entrega: ${deliveryAddress}\n`;
      msg += `\n💰 *Total: R$ ${orderTotal.toFixed(2)}*`;
      return encodeURIComponent(msg);
    };

    const whatsappLink = tenant.whatsapp
      ? `https://wa.me/${tenant.whatsapp.replace(/\D/g, "")}?text=${buildWhatsAppMessage()}`
      : null;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <Sonner />
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-bounce" style={{ backgroundColor: accentColor }}>
          <CheckCircle2 className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Pedido Enviado!</h1>
        {orderNumber && (
          <p className="text-5xl font-extrabold mb-2" style={{ color: accentColor }}>
            #{orderNumber}
          </p>
        )}
        <p className="text-muted-foreground mb-2">Seu pedido foi recebido e está sendo preparado.</p>
        {orderType === "delivery" && (
          <p className="text-sm text-muted-foreground mb-4">Entrega no endereço informado.</p>
        )}
        {orderType === "pickup" && (
          <p className="text-sm text-muted-foreground mb-4">Retire no balcão quando estiver pronto.</p>
        )}
        {orderType === "table" && tableNumber && (
          <p className="text-sm text-muted-foreground mb-4">Mesa {tableNumber} — aguarde no local.</p>
        )}

        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold bg-green-500 hover:bg-green-600 transition-colors mt-4"
          >
            <MessageSquare className="h-5 w-5" />
            Confirmar via WhatsApp
          </a>
        )}

        <Button
          onClick={() => { setOrderSent(false); setOrderNumber(null); setCustomerName(""); setCustomerPhone(""); setDeliveryAddress(""); setTableNumber(""); }}
          style={{ backgroundColor: accentColor }}
          className="text-white mt-4"
          size="lg"
        >
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
          <Input placeholder="Buscar no cardápio..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${!activeCategory ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              style={!activeCategory ? { backgroundColor: accentColor } : {}}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === cat.id ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
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
              onClick={() => openProductDetail(p)}
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

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <DialogContent className="max-w-md mx-auto p-0 overflow-hidden rounded-2xl">
          {selectedProduct && (
            <>
              {selectedProduct.image_url ? (
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-32 bg-muted flex items-center justify-center">
                  <Store className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}
              <div className="p-5 space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-xl">{selectedProduct.name}</DialogTitle>
                </DialogHeader>
                {selectedProduct.description && (
                  <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                )}
                <p className="text-2xl font-bold" style={{ color: accentColor }}>
                  R$ {Number(selectedProduct.sale_price).toFixed(2)}
                </p>

                <div>
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Observações
                  </label>
                  <Textarea
                    placeholder="Ex: sem cebola, bem passado..."
                    value={productNotes}
                    onChange={e => setProductNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => setProductQty(q => Math.max(1, q - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-bold w-8 text-center">{productQty}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => setProductQty(q => q + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={confirmAddProduct}
                    className="text-white px-6"
                    style={{ backgroundColor: accentColor }}
                    size="lg"
                  >
                    Adicionar R$ {(Number(selectedProduct.sale_price) * productQty).toFixed(2)}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <Sheet open={cartOpen} onOpenChange={(open) => { setCartOpen(open); if (!open) setCheckoutStep("cart"); }}>
          <SheetTrigger asChild>
            <button
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl text-white font-semibold shadow-xl transition-transform active:scale-95 w-[90%] max-w-lg"
              style={{ backgroundColor: accentColor }}
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Ver carrinho</span>
              <Badge className="bg-white/20 text-white border-0">{cartCount}</Badge>
              <span className="ml-auto font-bold">R$ {cartTotal.toFixed(2)}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl flex flex-col p-0">
            {checkoutStep === "cart" ? (
              <>
                <div className="px-5 pt-5 pb-3">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" style={{ color: accentColor }} />
                      Seu Pedido ({cartCount} {cartCount === 1 ? "item" : "itens"})
                    </SheetTitle>
                  </SheetHeader>
                </div>

                <div className="flex-1 overflow-auto px-5 space-y-3 pb-4">
                  {cart.map(c => (
                    <div key={c.product.id} className="rounded-xl bg-muted/50 p-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{c.product.name}</p>
                          <p className="text-xs text-muted-foreground">R$ {Number(c.product.sale_price).toFixed(2)} cada</p>
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
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFromCart(c.product.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      {c.notes ? (
                        <p className="text-xs text-muted-foreground italic pl-1">📝 {c.notes}</p>
                      ) : null}
                      <Input
                        placeholder="Adicionar observação..."
                        value={c.notes}
                        onChange={e => updateItemNotes(c.product.id, e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  ))}
                </div>

                <div className="border-t border-border px-5 py-4 space-y-3">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span style={{ color: accentColor }}>R$ {cartTotal.toFixed(2)}</span>
                  </div>
                  <Button
                    className="w-full text-white"
                    size="lg"
                    style={{ backgroundColor: accentColor }}
                    onClick={() => setCheckoutStep("info")}
                  >
                    Continuar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="px-5 pt-5 pb-3">
                  <button onClick={() => setCheckoutStep("cart")} className="flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground transition-colors">
                    <ChevronLeft className="h-4 w-4" /> Voltar ao carrinho
                  </button>
                  <SheetHeader>
                    <SheetTitle>Finalizar Pedido</SheetTitle>
                  </SheetHeader>
                </div>

                <div className="flex-1 overflow-auto px-5 space-y-5 pb-4">
                  {/* Order type */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Como deseja receber?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { type: "table" as OrderType, icon: UtensilsCrossed, label: "Na mesa" },
                        { type: "pickup" as OrderType, icon: Package, label: "Retirada" },
                        { type: "delivery" as OrderType, icon: MapPin, label: "Delivery" },
                      ]).map(opt => (
                        <button
                          key={opt.type}
                          onClick={() => setOrderType(opt.type)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                            orderType === opt.type ? "text-white border-transparent" : "border-border text-muted-foreground hover:border-muted-foreground/30"
                          }`}
                          style={orderType === opt.type ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                        >
                          <opt.icon className="h-5 w-5" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Customer info */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Seus dados</p>
                    <Input
                      placeholder={orderType === "delivery" ? "Seu nome *" : "Seu nome (opcional)"}
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                    />
                    <Input
                      placeholder="Telefone / WhatsApp (opcional)"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                    />
                  </div>

                  {/* Conditional fields */}
                  {orderType === "table" && (
                    <Input
                      placeholder="Número da mesa"
                      value={tableNumber}
                      onChange={e => setTableNumber(e.target.value)}
                    />
                  )}

                  {orderType === "delivery" && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Endereço de entrega *</p>
                        <Textarea
                          placeholder="Rua, número, bairro, complemento..."
                          value={deliveryAddress}
                          onChange={e => setDeliveryAddress(e.target.value)}
                          rows={3}
                        />
                      </div>

                      {/* Distance-based fee */}
                      {tenant?.store_lat && tenant?.store_lng && (
                        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                          <p className="text-xs font-medium">📍 Calcular taxa de entrega</p>
                          {distanceKm !== null ? (
                            <div className="space-y-1">
                              <p className="text-sm">
                                Distância: <span className="font-bold">{distanceKm.toFixed(1)} km</span>
                              </p>
                              <p className="text-sm">
                                Taxa: <span className="font-bold" style={{ color: accentColor }}>
                                  {deliveryFee === 0 ? "Grátis! 🎉" : `R$ ${deliveryFee.toFixed(2)}`}
                                </span>
                              </p>
                              {deliveryFee === 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Grátis até {Number(tenant.free_delivery_radius_km || 1)} km
                                </p>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs p-0 h-auto"
                                onClick={() => { setDistanceKm(null); setCustomerLat(null); setCustomerLng(null); }}
                              >
                                Recalcular
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={gettingLocation}
                              onClick={getCustomerLocation}
                              className="w-full"
                            >
                              <MapPin className="h-4 w-4 mr-1" />
                              {gettingLocation ? "Obtendo localização..." : "Usar minha localização"}
                            </Button>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            Grátis até {Number(tenant.free_delivery_radius_km || 1)} km, depois R$ {Number(tenant.delivery_fee_per_km || 2).toFixed(2)}/km
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-medium">Resumo do pedido</p>
                    {cart.map(c => (
                      <div key={c.product.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{c.quantity}x {c.product.name}</span>
                        <span className="font-medium">R$ {(Number(c.product.sale_price) * c.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">🛵 Taxa de entrega</span>
                        <span className="font-medium">R$ {deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2 flex justify-between text-base font-bold">
                      <span>Total</span>
                      <span style={{ color: accentColor }}>R$ {cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border px-5 py-4">
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
              </>
            )}
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
