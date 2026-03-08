import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock, ChefHat, CheckCircle, Truck, RefreshCw, Bell,
  Smartphone, Settings2, Link2, AlertCircle, Package
} from "lucide-react";
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

const statusFlow = ["received", "preparing", "ready", "delivered"];

const platformConfig = {
  ifood: { name: "iFood", color: "bg-red-500", textColor: "text-red-500", bgLight: "bg-red-500/10" },
  "99food": { name: "99Food", color: "bg-yellow-500", textColor: "text-yellow-500", bgLight: "bg-yellow-500/10" },
  whatsapp: { name: "WhatsApp", color: "bg-green-500", textColor: "text-green-500", bgLight: "bg-green-500/10" },
  site: { name: "Site Próprio", color: "bg-primary", textColor: "text-primary", bgLight: "bg-primary/10" },
};

const Delivery = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .in("source", ["ifood", "99food", "whatsapp", "site", "delivery"])
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) setOrders(data as Order[]);
    if (error) toast.error("Erro ao carregar pedidos");
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel("delivery-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (orderId: string, currentStatus: string) => {
    const currentIdx = statusFlow.indexOf(currentStatus);
    if (currentIdx < 0 || currentIdx >= statusFlow.length - 1) return;
    const nextStatus = statusFlow[currentIdx + 1];

    const { error } = await supabase.from("orders").update({ status: nextStatus }).eq("id", orderId);
    if (error) toast.error("Erro ao atualizar");
    else { toast.success(`Status: ${statusConfig[nextStatus]?.label}`); loadOrders(); }
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const getTimeDiff = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    return diff < 1 ? "agora" : diff < 60 ? `${diff}min` : `${Math.floor(diff / 60)}h${diff % 60}min`;
  };

  return (
    <div className="animate-fade-in space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders" className="gap-2">
            <Package className="h-4 w-4" /> Pedidos Delivery
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Link2 className="h-4 w-4" /> Integrações
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={loadOrders}>
              <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
            </Button>
            <Badge variant="secondary">{orders.filter(o => o.status === "received").length} novos</Badge>
            <Badge variant="secondary">{orders.filter(o => o.status === "preparing").length} em preparo</Badge>
            <Badge variant="secondary">{orders.filter(o => o.status === "ready").length} prontos</Badge>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : orders.length === 0 ? (
            <Card className="p-12 text-center">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Nenhum pedido de delivery</h3>
              <p className="text-muted-foreground text-sm">
                Quando pedidos do iFood, 99Food ou WhatsApp chegarem, eles aparecerão aqui.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {orders.map(order => {
                const cfg = statusConfig[order.status] || statusConfig.received;
                const StatusIcon = cfg.icon;
                const platform = platformConfig[order.source as keyof typeof platformConfig];
                const canAdvance = statusFlow.indexOf(order.status) >= 0 && statusFlow.indexOf(order.status) < statusFlow.length - 1;
                const nextStatus = canAdvance ? statusFlow[statusFlow.indexOf(order.status) + 1] : null;

                return (
                  <Card key={order.id} className="overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-extrabold text-primary">#{order.order_number}</span>
                        {platform && (
                          <Badge className={`${platform.bgLight} ${platform.textColor} border-0 text-xs`}>
                            {platform.name}
                          </Badge>
                        )}
                      </div>
                      <Badge className={`${cfg.color} border`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatTime(order.created_at)}
                        </span>
                        <span className="font-medium">{getTimeDiff(order.created_at)}</span>
                      </div>

                      {order.customer_name && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Cliente:</span>{" "}
                          <span className="font-medium">{order.customer_name}</span>
                          {order.customer_phone && <span className="text-muted-foreground ml-2">({order.customer_phone})</span>}
                        </p>
                      )}

                      <div className="space-y-1">
                        {order.order_items?.map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>
                              <span className="font-bold text-primary mr-1">{item.quantity}x</span>
                              {item.product_name}
                            </span>
                            <span className="text-muted-foreground">R$ {Number(item.total).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <p className="text-xs text-muted-foreground bg-muted rounded p-2">📝 {order.notes}</p>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-border">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="text-lg font-bold">R$ {Number(order.total).toFixed(2)}</span>
                      </div>
                    </div>

                    {order.status !== "delivered" && order.status !== "cancelled" && (
                      <div className="p-4 pt-0 flex gap-2">
                        {canAdvance && nextStatus && (
                          <Button className="flex-1" size="sm" onClick={() => updateStatus(order.id, order.status)}>
                            {statusConfig[nextStatus]?.label || "Avançar"}
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* iFood */}
            <Card className="overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-red-500 flex items-center justify-center text-white font-bold text-lg">
                    iF
                  </div>
                  <div>
                    <h3 className="font-semibold">iFood</h3>
                    <p className="text-xs text-muted-foreground">Marketplace de delivery</p>
                  </div>
                  <Badge variant="outline" className="ml-auto text-yellow-500 border-yellow-500/30">
                    <AlertCircle className="h-3 w-3 mr-1" /> Pendente
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receba pedidos do iFood diretamente no seu painel. Os pedidos aparecerão automaticamente na central de pedidos.
                </p>
                <div className="bg-muted rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium">Para integrar:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Acesse o Portal do Parceiro iFood</li>
                    <li>Gere suas credenciais de API (Client ID e Secret)</li>
                    <li>Configure as credenciais abaixo</li>
                  </ol>
                </div>
                <Button variant="outline" className="w-full gap-2" disabled>
                  <Settings2 className="h-4 w-4" /> Configurar iFood
                  <Badge variant="secondary" className="ml-auto text-xs">Em breve</Badge>
                </Button>
              </div>
            </Card>

            {/* 99Food */}
            <Card className="overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-yellow-500 flex items-center justify-center text-white font-bold text-lg">
                    99
                  </div>
                  <div>
                    <h3 className="font-semibold">99Food</h3>
                    <p className="text-xs text-muted-foreground">Plataforma de entrega</p>
                  </div>
                  <Badge variant="outline" className="ml-auto text-yellow-500 border-yellow-500/30">
                    <AlertCircle className="h-3 w-3 mr-1" /> Pendente
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Integre com o 99Food para receber pedidos automaticamente no sistema.
                </p>
                <div className="bg-muted rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium">Para integrar:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Entre em contato com o suporte 99Food</li>
                    <li>Solicite acesso à API de parceiros</li>
                    <li>Configure as credenciais abaixo</li>
                  </ol>
                </div>
                <Button variant="outline" className="w-full gap-2" disabled>
                  <Settings2 className="h-4 w-4" /> Configurar 99Food
                  <Badge variant="secondary" className="ml-auto text-xs">Em breve</Badge>
                </Button>
              </div>
            </Card>

            {/* WhatsApp */}
            <Card className="overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-green-500 flex items-center justify-center text-white font-bold text-lg">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">WhatsApp</h3>
                    <p className="text-xs text-muted-foreground">Pedidos via mensagem</p>
                  </div>
                  <Badge variant="outline" className="ml-auto text-yellow-500 border-yellow-500/30">
                    <AlertCircle className="h-3 w-3 mr-1" /> Pendente
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receba pedidos via WhatsApp Business API e gerencie tudo em um só lugar.
                </p>
                <Button variant="outline" className="w-full gap-2" disabled>
                  <Settings2 className="h-4 w-4" /> Configurar WhatsApp
                  <Badge variant="secondary" className="ml-auto text-xs">Em breve</Badge>
                </Button>
              </div>
            </Card>

            {/* Site Próprio */}
            <Card className="overflow-hidden border-primary/30">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg">
                    <Link2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Cardápio Digital</h3>
                    <p className="text-xs text-muted-foreground">Pedidos pelo seu QR Code</p>
                  </div>
                  <Badge className="ml-auto bg-green-500/20 text-green-500 border-0">
                    <CheckCircle className="h-3 w-3 mr-1" /> Ativo
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Seus clientes já podem fazer pedidos pelo cardápio digital via QR Code. Os pedidos aparecem automaticamente.
                </p>
                <Button variant="outline" className="w-full gap-2" onClick={() => window.location.href = "/app/settings"}>
                  <Settings2 className="h-4 w-4" /> Ver QR Code nas Configurações
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Delivery;
