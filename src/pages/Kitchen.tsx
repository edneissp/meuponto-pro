import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Flame, AlertTriangle, CheckCircle2, Printer, Volume2, VolumeX, ChefHat, Timer, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  notes: string | null;
}

interface KdsOrder {
  id: string;
  order_number: number;
  source: string;
  status: string;
  table_number: string | null;
  customer_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

const STATUS_MAP: Record<string, { label: string; color: string; next: string | null }> = {
  received: { label: "Novo", color: "bg-blue-500", next: "preparing" },
  preparing: { label: "Em Preparo", color: "bg-amber-500", next: "ready" },
  ready: { label: "Pronto", color: "bg-green-500", next: "delivered" },
  delivered: { label: "Entregue", color: "bg-muted", next: null },
  cancelled: { label: "Cancelado", color: "bg-destructive", next: null },
};

const SOURCE_LABELS: Record<string, string> = {
  pos: "PDV",
  table: "Mesa",
  delivery: "Delivery",
  digital_menu: "Cardápio Digital",
  whatsapp: "WhatsApp",
};

const SECTORS = [
  { value: "all", label: "Todos" },
  { value: "cozinha", label: "Cozinha" },
  { value: "bar", label: "Bar" },
  { value: "sobremesas", label: "Sobremesas" },
  { value: "bebidas", label: "Bebidas" },
];

function getElapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function getUrgencyClass(minutes: number): string {
  if (minutes >= 10) return "border-destructive border-2 animate-pulse";
  if (minutes >= 5) return "border-amber-500 border-2";
  return "border-border";
}

function getUrgencyIcon(minutes: number) {
  if (minutes >= 10) return <Flame className="h-4 w-4 text-destructive" />;
  if (minutes >= 5) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

const Kitchen = () => {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [sector, setSector] = useState("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const knownOrderIds = useRef<Set<string>>(new Set());
  const [tick, setTick] = useState(0);

  // Tick every 30s to update elapsed times
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!tenantId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: ordersData, error } = await supabase
      .from("orders")
      .select("id, order_number, source, status, table_number, customer_name, notes, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: true });

    if (error || !ordersData) {
      setLoading(false);
      return;
    }

    const orderIds = ordersData.map((o) => o.id);
    let items: OrderItem[] = [];
    if (orderIds.length > 0) {
      const { data: itemsData } = await supabase
        .from("order_items")
        .select("id, order_id, product_name, quantity, notes")
        .in("order_id", orderIds);
      items = (itemsData || []) as any;
    }

    const itemsByOrder = items.reduce<Record<string, OrderItem[]>>((acc, item: any) => {
      if (!acc[item.order_id]) acc[item.order_id] = [];
      acc[item.order_id].push(item);
      return acc;
    }, {});

    const mapped: KdsOrder[] = ordersData.map((o) => ({
      ...o,
      items: itemsByOrder[o.id] || [],
    }));

    // Detect new orders for sound
    const newIds = mapped
      .filter((o) => o.status === "received" && !knownOrderIds.current.has(o.id))
      .map((o) => o.id);

    if (newIds.length > 0 && knownOrderIds.current.size > 0 && soundEnabled) {
      playAlert();
    }

    knownOrderIds.current = new Set(mapped.map((o) => o.id));
    setOrders(mapped);
    setLoading(false);
  }, [tenantId, soundEnabled]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime subscription
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("kds-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `tenant_id=eq.${tenantId}` }, () => {
        fetchOrders();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items", filter: `tenant_id=eq.${tenantId}` }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId, fetchOrders]);

  const playAlert = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1100;
        osc2.type = "sine";
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 350);
    } catch {}
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handlePrint = (order: KdsOrder) => {
    const printContent = `
      <html><head><title>Comanda #${order.order_number}</title>
      <style>body{font-family:monospace;font-size:14px;width:280px;margin:0 auto}
      h2{text-align:center;border-bottom:2px dashed #000;padding-bottom:8px}
      .item{margin:4px 0}.notes{font-style:italic;color:#666;font-size:12px}
      .meta{font-size:12px;color:#444;margin-top:8px}</style></head><body>
      <h2>COMANDA #${order.order_number}</h2>
      <div class="meta">${SOURCE_LABELS[order.source] || order.source}${order.table_number ? ` | Mesa ${order.table_number}` : ""}${order.customer_name ? ` | ${order.customer_name}` : ""}</div>
      <div class="meta">${new Date(order.created_at).toLocaleTimeString("pt-BR")}</div>
      <hr/>
      ${order.items.map((i) => `<div class="item"><b>${i.quantity}x</b> ${i.product_name}${i.notes ? `<div class="notes">Obs: ${i.notes}</div>` : ""}</div>`).join("")}
      ${order.notes ? `<hr/><div class="notes">Obs geral: ${order.notes}</div>` : ""}
      </body></html>
    `;
    const w = window.open("", "_blank", "width=320,height=500");
    if (w) {
      w.document.write(printContent);
      w.document.close();
      w.print();
    }
  };

  // Computed metrics
  const activeOrders = useMemo(() => orders.filter((o) => ["received", "preparing"].includes(o.status)), [orders]);
  const readyOrders = useMemo(() => orders.filter((o) => o.status === "ready"), [orders]);
  const deliveredOrders = useMemo(() => orders.filter((o) => o.status === "delivered"), [orders]);

  const avgPrepTime = useMemo(() => {
    const delivered = orders.filter((o) => o.status === "delivered" || o.status === "ready");
    if (delivered.length === 0) return 0;
    const total = delivered.reduce((sum, o) => {
      const diff = new Date(o.updated_at).getTime() - new Date(o.created_at).getTime();
      return sum + diff / 60000;
    }, 0);
    return Math.round(total / delivered.length);
  }, [orders]);

  const displayOrders = useMemo(() => {
    let filtered: KdsOrder[];
    if (activeTab === "active") {
      filtered = orders.filter((o) => ["received", "preparing", "ready"].includes(o.status));
    } else {
      filtered = orders.filter((o) => o.status === "delivered");
    }
    return filtered;
  }, [orders, activeTab, sector]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><ChefHat className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Na Fila</p>
              <p className="text-xl font-bold">{orders.filter((o) => o.status === "received").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Flame className="h-5 w-5 text-amber-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Em Preparo</p>
              <p className="text-xl font-bold">{orders.filter((o) => o.status === "preparing").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Timer className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Tempo Médio</p>
              <p className="text-xl font-bold">{avgPrepTime} min</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><TrendingUp className="h-5 w-5 text-green-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Finalizados Hoje</p>
              <p className="text-xl font-bold">{deliveredOrders.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">
              Ativos ({activeOrders.length + readyOrders.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              Histórico ({deliveredOrders.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={sector} onValueChange={setSector}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTORS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? "Desativar som" : "Ativar som"}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>

      {/* Orders Grid */}
      {displayOrders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">
            {activeTab === "active" ? "Nenhum pedido ativo" : "Nenhum pedido finalizado hoje"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayOrders.map((order) => {
            const elapsed = getElapsedMinutes(order.created_at);
            const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.received;
            const isActive = ["received", "preparing"].includes(order.status);

            return (
              <Card
                key={order.id}
                className={`transition-all ${isActive ? getUrgencyClass(elapsed) : "border-border"} ${order.status === "received" ? "shadow-lg" : ""}`}
              >
                <CardHeader className="p-3 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">#{order.order_number}</CardTitle>
                    <Badge className={`${statusInfo.color} text-white border-0`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {SOURCE_LABELS[order.source] || order.source}
                    </Badge>
                    {order.table_number && (
                      <span>Mesa {order.table_number}</span>
                    )}
                    {order.customer_name && (
                      <span>{order.customer_name}</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-3 pt-0 space-y-2">
                  {/* Items */}
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="text-sm">
                        <span className="font-semibold">{item.quantity}x</span>{" "}
                        {item.product_name}
                        {item.notes && (
                          <p className="text-xs text-muted-foreground ml-4 italic">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <p className="text-xs bg-muted p-2 rounded italic">
                      Obs: {order.notes}
                    </p>
                  )}

                  {/* Time */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                    {isActive && getUrgencyIcon(elapsed)}
                    <span>{new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    {isActive && <span className="font-medium">• {elapsed} min</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    {statusInfo.next && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => updateStatus(order.id, statusInfo.next!)}
                      >
                        {statusInfo.next === "preparing" && "Iniciar Preparo"}
                        {statusInfo.next === "ready" && "Marcar Pronto"}
                        {statusInfo.next === "delivered" && "Entregar"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrint(order)}
                      title="Imprimir comanda"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Kitchen;
