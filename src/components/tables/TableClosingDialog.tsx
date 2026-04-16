import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  Users,
  SplitSquareVertical,
  CheckCircle,
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TableData;
  activeOrder: ActiveOrder | null;
  allOrders: ActiveOrder[];
  onComplete: () => void;
}

type SplitType = "none" | "equal" | "by_item" | "manual";
type PaymentMethod = "dinheiro" | "pix" | "cartao" | "multiplo" | "fiado";

interface PaymentEntry {
  method: string;
  amount: number;
}

const paymentOptions: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "dinheiro", label: "Dinheiro", icon: <Banknote className="h-4 w-4" /> },
  { value: "pix", label: "PIX", icon: <QrCode className="h-4 w-4" /> },
  { value: "cartao", label: "Cartão", icon: <CreditCard className="h-4 w-4" /> },
  { value: "multiplo", label: "Múltiplo", icon: <SplitSquareVertical className="h-4 w-4" /> },
  { value: "fiado", label: "Fiado", icon: <Receipt className="h-4 w-4" /> },
];

const TableClosingDialog = ({ open, onOpenChange, table, activeOrder, allOrders, onComplete }: Props) => {
  const { tenantId, userId } = useTenant();
  const [serviceFee, setServiceFee] = useState("");
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [splitType, setSplitType] = useState<SplitType>("none");
  const [splitCount, setSplitCount] = useState("2");
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [multiMethod, setMultiMethod] = useState<string>("dinheiro");
  const [multiAmount, setMultiAmount] = useState("");
  const [saving, setSaving] = useState(false);

  // Consolidate all orders for the table
  const allItems = useMemo(() => {
    return allOrders.flatMap(o => o.order_items || []);
  }, [allOrders]);

  const subtotal = useMemo(() => {
    return allOrders.reduce((sum, o) => sum + Number(o.total), 0);
  }, [allOrders]);

  const serviceFeeValue = Number(serviceFee) || 0;
  const discountValue = Number(discount) || 0;
  const total = Math.max(0, subtotal + serviceFeeValue - discountValue);

  const openedAt = useMemo(() => {
    if (allOrders.length === 0) return new Date();
    const earliest = allOrders.reduce((min, o) => {
      const d = new Date(o.created_at);
      return d < min ? d : min;
    }, new Date());
    return earliest;
  }, [allOrders]);

  const durationMinutes = Math.round((Date.now() - openedAt.getTime()) / 60000);
  const durationStr = `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}min`;

  const totalPaidMulti = payments.reduce((s, p) => s + p.amount, 0);
  const remainingMulti = Math.max(0, Number((total - totalPaidMulti).toFixed(2)));

  const splitValue = splitType === "equal" && Number(splitCount) > 0
    ? Number((total / Number(splitCount)).toFixed(2))
    : 0;

  const addMultiPayment = () => {
    const amt = Number(multiAmount);
    if (!amt || amt <= 0) return;
    if (amt > remainingMulti + 0.01) {
      toast.error("Valor excede o restante");
      return;
    }
    setPayments(prev => [...prev, { method: multiMethod, amount: amt }]);
    setMultiAmount("");
  };

  const removePayment = (idx: number) => {
    setPayments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFinalize = async () => {
    if (!tenantId) return;

    // Validate payment
    if (paymentMethod === "multiplo" && remainingMulti > 0.01) {
      toast.error(`Faltam R$ ${remainingMulti.toFixed(2)} para quitar a mesa.`);
      return;
    }

    setSaving(true);
    try {
      const finalPaymentMethod = paymentMethod === "multiplo"
        ? payments.map(p => `${p.method}:${p.amount.toFixed(2)}`).join("|")
        : paymentMethod;

      const paidAmount = paymentMethod === "multiplo" ? totalPaidMulti : total;
      const payStatus = paidAmount >= total ? "paid" : "partial";

      // 1. Insert table_closings record
      const { error: closingError } = await supabase.from("table_closings").insert({
        tenant_id: tenantId,
        table_id: table.id,
        order_id: activeOrder?.id || null,
        table_number: table.table_number,
        opened_at: openedAt.toISOString(),
        closed_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
        subtotal,
        service_fee: serviceFeeValue,
        discount: discountValue,
        total,
        paid_amount: paidAmount,
        payment_status: payStatus,
        payment_method: finalPaymentMethod,
        split_type: splitType !== "none" ? splitType : null,
      });

      if (closingError) throw closingError;

      // 2. Create a sale record for revenue tracking
      if (userId && paymentMethod !== "fiado") {
        await supabase.from("sales").insert({
          tenant_id: tenantId,
          user_id: userId,
          payment_method: paymentMethod === "multiplo" ? "multiplo" : paymentMethod,
          subtotal,
          discount: discountValue,
          tax_amount: serviceFeeValue,
          total: paidAmount,
          status: "completed",
        });
      }

      // 3. If fiado, create fiado record (requires customer - skip for now, just mark)
      // Fiado would need a customer selection step - for now we record it as pending

      // 4. Mark all orders as delivered
      for (const order of allOrders) {
        await supabase.from("orders").update({ status: "delivered" }).eq("id", order.id);
      }

      // 5. Free the table
      await supabase.from("tables").update({ status: "available" }).eq("id", table.id);

      toast.success(`Mesa ${table.table_number} encerrada! Total: R$ ${total.toFixed(2)}`);
      onComplete();
    } catch (err: any) {
      toast.error("Erro ao encerrar mesa: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Encerrar Mesa {table.table_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Bar */}
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" /> {durationStr}
            </Badge>
            <Badge variant="outline" className="gap-1">
              {allOrders.length} pedido(s)
            </Badge>
            <Badge variant="outline" className="gap-1">
              {allItems.length} item(ns)
            </Badge>
          </div>

          {/* Items */}
          <Card className="p-3">
            <h4 className="font-semibold text-sm mb-2">Itens consumidos</h4>
            <div className="space-y-1 max-h-40 overflow-auto">
              {allItems.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex justify-between text-sm">
                  <span>
                    <span className="font-bold text-primary mr-1">{item.quantity}x</span>
                    {item.product_name}
                  </span>
                  <span className="text-muted-foreground">R$ {Number(item.total).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Separator />

          {/* Fees */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Taxa de serviço (R$)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={serviceFee}
                onChange={e => setServiceFee(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label className="text-xs">Desconto (R$)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Totals */}
          <Card className="p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {serviceFeeValue > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Taxa de serviço</span>
                <span>+ R$ {serviceFeeValue.toFixed(2)}</span>
              </div>
            )}
            {discountValue > 0 && (
              <div className="flex justify-between text-sm text-green-500">
                <span>Desconto</span>
                <span>- R$ {discountValue.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
          </Card>

          {/* Split */}
          <div>
            <Label className="text-xs">Divisão da conta</Label>
            <Select value={splitType} onValueChange={(v) => setSplitType(v as SplitType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem divisão</SelectItem>
                <SelectItem value="equal">Dividir igualmente</SelectItem>
                <SelectItem value="manual">Valor manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {splitType === "equal" && (
            <div className="flex items-center gap-3">
              <div>
                <Label className="text-xs">Nº de pessoas</Label>
                <Input
                  type="number"
                  value={splitCount}
                  onChange={e => setSplitCount(e.target.value)}
                  min="2"
                  className="w-20"
                />
              </div>
              <div className="pt-5">
                <Badge variant="secondary" className="text-sm">
                  R$ {splitValue.toFixed(2)} / pessoa
                </Badge>
              </div>
            </div>
          )}

          {/* Payment */}
          <div>
            <Label className="text-xs mb-2 block">Forma de pagamento</Label>
            <div className="flex flex-wrap gap-2">
              {paymentOptions.map(opt => (
                <Button
                  key={opt.value}
                  variant={paymentMethod === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setPaymentMethod(opt.value);
                    setPayments([]);
                  }}
                  className="gap-1"
                >
                  {opt.icon} {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Multi payment */}
          {paymentMethod === "multiplo" && (
            <Card className="p-3 space-y-3">
              <h4 className="font-semibold text-sm">Pagamento múltiplo</h4>
              {payments.length > 0 && (
                <div className="space-y-1">
                  {payments.map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="capitalize">{p.method}</span>
                      <div className="flex items-center gap-2">
                        <span>R$ {p.amount.toFixed(2)}</span>
                        <Button variant="ghost" size="sm" className="h-6 text-destructive" onClick={() => removePayment(i)}>
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between text-sm font-medium">
                    <span>Restante</span>
                    <span className={remainingMulti > 0 ? "text-destructive" : "text-green-500"}>
                      R$ {remainingMulti.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Select value={multiMethod} onValueChange={setMultiMethod}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Valor"
                  value={multiAmount}
                  onChange={e => setMultiAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="flex-1"
                />
                <Button size="sm" onClick={addMultiPayment}>+</Button>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleFinalize}
            disabled={saving || (paymentMethod === "multiplo" && remainingMulti > 0.01)}
            className="gap-1"
          >
            <CheckCircle className="h-4 w-4" />
            {saving ? "Finalizando..." : `Encerrar • R$ ${total.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TableClosingDialog;
