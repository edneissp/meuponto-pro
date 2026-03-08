import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ChefHat, CheckCircle, Truck, RefreshCw, Bell, BellOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes: string | null;
}

interface Order {
  id: string;
  order_number: number;
  source: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  table_number: string | null;
  total: number;
  notes: string | null;
  created_at: string;
  order_items: OrderItem[];
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  received: { label: "Recebido", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Bell },
  preparing: { label: "Preparando", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: ChefHat },
  ready: { label: "Pronto", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
  delivered: { label: "Entregue", color: "bg-muted text-muted-foreground border-border", icon: Truck },
  cancelled: { label: "Cancelado", color: "bg-destructive/20 text-destructive border-destructive/30", icon: Clock },
};

const sourceLabels: Record<string, string> = {
  digital_menu: "Cardápio Digital",
  counter: "Balcão",
  delivery: "Delivery",
  waiter: "Garçom",
};

const statusFlow = ["received", "preparing", "ready", "delivered"];

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const initialLoadDone = useRef(false);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Pleasant two-tone chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.log("Audio not available");
    }
  }, [soundEnabled]);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) setOrders(data as Order[]);
    if (error) toast.error("Erro ao carregar pedidos");
    setLoading(false);
  };

  useEffect(() => {
    loadOrders().then(() => {
      initialLoadDone.current = true;
    });

    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          if (initialLoadDone.current) {
            playNotificationSound();
            const orderNum = (payload.new as any)?.order_number;
            toast.success(`🔔 Novo pedido recebido!${orderNum ? ` #${orderNum}` : ""}`, {
              duration: 8000,
            });
          }
          loadOrders();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => { loadOrders(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [playNotificationSound]);

  const updateStatus = async (orderId: string, currentStatus: string) => {
    const currentIdx = statusFlow.indexOf(currentStatus);
    if (currentIdx < 0 || currentIdx >= statusFlow.length - 1) return;
    const nextStatus = statusFlow[currentIdx + 1];

    const { error } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(`Pedido movido para: ${statusConfig[nextStatus]?.label}`);
      loadOrders();
    }
  };

  const cancelOrder = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);

    if (error) toast.error("Erro ao cancelar");
    else { toast.success("Pedido cancelado"); loadOrders(); }
  };

  const filtered = orders.filter(o => !filter || o.status === filter);

  const activeStatuses = ["received", "preparing", "ready"];
  const activeCounts = activeStatuses.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const getTimeDiff = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return "agora";
    if (diff < 60) return `${diff}min`;
    return `${Math.floor(diff / 60)}h${diff % 60}min`;
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setFilter(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !filter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Todos ({orders.length})
        </button>
        {activeStatuses.map(s => {
          const cfg = statusConfig[s];
          return (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? null : s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <cfg.icon className="h-4 w-4" />
              {cfg.label} ({activeCounts[s]})
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              toast.info(soundEnabled ? "Notificação sonora desativada" : "Notificação sonora ativada");
            }}
            title={soundEnabled ? "Desativar som" : "Ativar som"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={loadOrders}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando pedidos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum pedido encontrado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(order => {
            const cfg = statusConfig[order.status] || statusConfig.received;
            const StatusIcon = cfg.icon;
            const canAdvance = statusFlow.indexOf(order.status) >= 0 && statusFlow.indexOf(order.status) < statusFlow.length - 1;
            const nextStatus = canAdvance ? statusFlow[statusFlow.indexOf(order.status) + 1] : null;

            return (
              <Card key={order.id} className="overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-extrabold text-primary">#{order.order_number}</span>
                    <Badge variant="outline" className="text-xs">
                      {sourceLabels[order.source] || order.source}
                    </Badge>
                  </div>
                  <Badge className={`${cfg.color} border`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {cfg.label}
                  </Badge>
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(order.created_at)}
                    </span>
                    <span className="font-medium">{getTimeDiff(order.created_at)}</span>
                    {order.table_number && <Badge variant="secondary">Mesa {order.table_number}</Badge>}
                  </div>

                  {order.customer_name && (
                    <p className="text-sm"><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{order.customer_name}</span></p>
                  )}

                  {/* Items */}
                  <div className="space-y-1">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          <span className="font-bold text-primary mr-1">{item.quantity}x</span>
                          {item.product_name}
                        </span>
                        <span className="text-muted-foreground">R$ {Number(item.total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-lg font-bold">R$ {Number(order.total).toFixed(2)}</span>
                  </div>
                </div>

                {/* Actions */}
                {order.status !== "delivered" && order.status !== "cancelled" && (
                  <div className="p-4 pt-0 flex gap-2">
                    {canAdvance && nextStatus && (
                      <Button
                        className="flex-1"
                        size="sm"
                        onClick={() => updateStatus(order.id, order.status)}
                      >
                        {statusConfig[nextStatus]?.label || "Avançar"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => cancelOrder(order.id)}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;
