import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer } from "lucide-react";

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ReceiptData {
  saleId: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  date: Date;
}

const paymentLabels: Record<string, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  credit_card: "Cartão Crédito",
  debit_card: "Cartão Débito",
  fiado: "Fiado",
};

const ThermalReceipt = ({ open, onClose, data }: { open: boolean; onClose: () => void; data: ReceiptData | null }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Recibo</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 4mm; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 4px 0; }
        .row { display: flex; justify-content: space-between; }
        .item-name { max-width: 60%; }
        .mb { margin-bottom: 2px; }
        @media print { @page { margin: 0; size: 80mm auto; } }
      </style></head><body>
      ${receiptRef.current.innerHTML}
      <script>window.onload=function(){window.print();window.close();}<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  if (!data) return null;

  const dateStr = data.date.toLocaleDateString("pt-BR");
  const timeStr = data.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" /> Recibo da Venda
          </DialogTitle>
        </DialogHeader>

        {/* Receipt preview */}
        <div ref={receiptRef} className="font-mono text-xs p-4 bg-card border rounded-lg space-y-1">
          <div className="text-center font-bold text-sm mb-1">MeuPonto</div>
          <div className="text-center text-muted-foreground mb-1">{dateStr} {timeStr}</div>
          <div className="text-center text-muted-foreground mb-2">Venda #{data.saleId.slice(0, 8)}</div>
          <div className="border-t border-dashed border-border my-1" />

          {data.items.map((item, i) => (
            <div key={i} className="mb-1">
              <div className="truncate">{item.name}</div>
              <div className="flex justify-between text-muted-foreground">
                <span>{item.quantity}x R$ {item.unitPrice.toFixed(2)}</span>
                <span>R$ {item.total.toFixed(2)}</span>
              </div>
            </div>
          ))}

          <div className="border-t border-dashed border-border my-1" />
          <div className="flex justify-between"><span>Subtotal</span><span>R$ {data.subtotal.toFixed(2)}</span></div>
          {data.discount > 0 && (
            <div className="flex justify-between"><span>Desconto</span><span>-R$ {data.discount.toFixed(2)}</span></div>
          )}
          {data.taxAmount > 0 && (
            <div className="flex justify-between"><span>Taxa</span><span>+R$ {data.taxAmount.toFixed(2)}</span></div>
          )}
          <div className="border-t border-dashed border-border my-1" />
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span><span>R$ {data.total.toFixed(2)}</span>
          </div>
          <div className="border-t border-dashed border-border my-1" />
          <div className="flex justify-between"><span>Pagamento</span><span>{paymentLabels[data.paymentMethod] || data.paymentMethod}</span></div>
          {data.customerName && (
            <div className="flex justify-between"><span>Cliente</span><span>{data.customerName}</span></div>
          )}
          <div className="border-t border-dashed border-border my-2" />
          <div className="text-center text-muted-foreground">Obrigado pela preferência!</div>
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

export default ThermalReceipt;
