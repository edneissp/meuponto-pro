import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer } from "lucide-react";

interface OrderReceiptItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes: string | null;
}

interface OrderReceiptData {
  order_number: number;
  source: string;
  customer_name: string | null;
  customer_phone: string | null;
  table_number: string | null;
  total: number;
  notes: string | null;
  created_at: string;
  items: OrderReceiptItem[];
}

const sourceLabels: Record<string, string> = {
  digital_menu: "Cardápio Digital",
  counter: "Balcão",
  delivery: "Delivery",
  waiter: "Garçom",
};

const OrderReceipt = ({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: OrderReceiptData | null;
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Comanda</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 4mm; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .big { font-size: 18px; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; }
        .mb { margin-bottom: 4px; }
        .item-notes { font-size: 10px; font-style: italic; color: #666; margin-left: 8px; }
        @media print { @page { margin: 0; size: 80mm auto; } }
      </style></head><body>
      ${receiptRef.current.innerHTML}
      <script>window.onload=function(){window.print();window.close();}<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  if (!data) return null;

  const date = new Date(data.created_at);
  const dateStr = date.toLocaleDateString("pt-BR");
  const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" /> Comanda do Pedido
          </DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="font-mono text-xs p-4 bg-card border rounded-lg space-y-1">
          <div className="text-center font-bold text-base mb-1">*** COMANDA ***</div>
          <div className="text-center font-bold text-2xl mb-1">#{data.order_number}</div>
          <div className="text-center text-muted-foreground mb-1">
            {sourceLabels[data.source] || data.source}
          </div>
          <div className="text-center text-muted-foreground mb-2">
            {dateStr} {timeStr}
          </div>

          {(data.customer_name || data.table_number || data.customer_phone) && (
            <>
              <div className="border-t border-dashed border-border my-1" />
              {data.table_number && (
                <div className="text-center font-bold text-lg">MESA {data.table_number}</div>
              )}
              {data.customer_name && (
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span className="font-bold">{data.customer_name}</span>
                </div>
              )}
              {data.customer_phone && (
                <div className="flex justify-between">
                  <span>Telefone:</span>
                  <span>{data.customer_phone}</span>
                </div>
              )}
            </>
          )}

          <div className="border-t border-dashed border-border my-1" />

          {data.items.map((item, i) => (
            <div key={i} className="mb-1">
              <div className="flex justify-between">
                <span className="font-bold">{item.quantity}x {item.product_name}</span>
                <span>R$ {Number(item.total).toFixed(2)}</span>
              </div>
              {item.notes && (
                <div className="text-muted-foreground italic text-[10px] ml-2">
                  → {item.notes}
                </div>
              )}
            </div>
          ))}

          <div className="border-t border-dashed border-border my-1" />
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span>
            <span>R$ {Number(data.total).toFixed(2)}</span>
          </div>

          {data.notes && (
            <>
              <div className="border-t border-dashed border-border my-1" />
              <div className="text-muted-foreground">Obs: {data.notes}</div>
            </>
          )}

          <div className="border-t border-dashed border-border my-2" />
          <div className="text-center text-muted-foreground text-[10px]">
            Impresso em {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handlePrint} className="flex-1 gap-2">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderReceipt;
