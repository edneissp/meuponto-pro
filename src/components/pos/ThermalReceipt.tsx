import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, FileText, Loader2, Download } from "lucide-react";
import { focusNfeService } from "@/services/focusNfeService";
import { checkTenantFiscalReady, isValidCpfCnpj, onlyDigits } from "@/lib/fiscalValidation";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

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
  const { tenantId } = useTenant();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [nfceOpen, setNfceOpen] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [customerDoc, setCustomerDoc] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [fiscalEnabled, setFiscalEnabled] = useState(false);

  useEffect(() => {
    if (!open || !tenantId) return;
    checkTenantFiscalReady(tenantId).then((ready) => setFiscalEnabled(ready.ok));
  }, [open, tenantId]);

  const buildReceiptPdf = () => {
    if (!data) return null;
    const doc = new jsPDF({ unit: "mm", format: [80, 180] });
    let y = 8;
    doc.setFont("courier", "bold");
    doc.setFontSize(12);
    doc.text("MeuPonto", 40, y, { align: "center" });
    y += 6;
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text(`${dateStr} ${timeStr}`, 40, y, { align: "center" });
    y += 5;
    doc.text(`Venda #${data.saleId.slice(0, 8)}`, 40, y, { align: "center" });
    y += 5;
    doc.text("--------------------------------", 4, y);
    y += 5;
    data.items.forEach((item) => {
      const lines = doc.splitTextToSize(item.name, 70);
      doc.text(lines, 4, y);
      y += lines.length * 4;
      doc.text(`${item.quantity}x R$ ${item.unitPrice.toFixed(2)}`, 4, y);
      doc.text(`R$ ${item.total.toFixed(2)}`, 76, y, { align: "right" });
      y += 5;
    });
    doc.text("--------------------------------", 4, y);
    y += 5;
    doc.text("Subtotal", 4, y);
    doc.text(`R$ ${data.subtotal.toFixed(2)}`, 76, y, { align: "right" });
    y += 5;
    if (data.discount > 0) {
      doc.text("Desconto", 4, y);
      doc.text(`-R$ ${data.discount.toFixed(2)}`, 76, y, { align: "right" });
      y += 5;
    }
    if (data.taxAmount > 0) {
      doc.text("Taxa", 4, y);
      doc.text(`+R$ ${data.taxAmount.toFixed(2)}`, 76, y, { align: "right" });
      y += 5;
    }
    doc.text("--------------------------------", 4, y);
    y += 6;
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL", 4, y);
    doc.text(`R$ ${data.total.toFixed(2)}`, 76, y, { align: "right" });
    y += 6;
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text(`Pagamento: ${paymentLabels[data.paymentMethod] || data.paymentMethod}`, 4, y);
    y += 5;
    if (data.customerName) {
      doc.text(`Cliente: ${data.customerName}`, 4, y);
      y += 5;
    }
    doc.text("--------------------------------", 4, y);
    y += 5;
    doc.text("Recibo sem valor fiscal", 40, y, { align: "center" });
    y += 5;
    doc.text("Obrigado pela preferencia!", 40, y, { align: "center" });
    return doc;
  };

  const handleDownloadPdf = () => {
    const doc = buildReceiptPdf();
    if (!doc || !data) return;
    doc.save(`recibo-venda-${data.saleId.slice(0, 8)}.pdf`);
  };

  const handlePrintPdf = () => {
    const doc = buildReceiptPdf();
    if (!doc) return;
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  };

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

  const handleEmitNfce = async () => {
    if (!data) return;
    if (!tenantId) return;
    const ready = await checkTenantFiscalReady(tenantId);
    if (!ready.ok) {
      toast.error("Configure o módulo fiscal para emitir notas", { description: ready.missing.join(", ") });
      return;
    }
    const docDigits = onlyDigits(customerDoc);
    if (docDigits && !isValidCpfCnpj(docDigits)) {
      toast.error("CPF/CNPJ inválido", { description: "Corrija o documento do consumidor antes de emitir." });
      return;
    }
    setEmitting(true);
    const result = await focusNfeService.emitirNota({
      type: "nfce",
      amount: data.total,
      sale_id: data.saleId,
      customer_name: customerName || data.customerName || null,
      customer_document: docDigits || null,
      items: data.items.map((it) => ({
        descricao: it.name,
        quantidade: it.quantity,
        valor_unitario: it.unitPrice,
      })),
    });
    setEmitting(false);

    if (result.success) {
      const statusLabel = (result as any).status === "issued" ? "autorizada" : "em processamento";
      toast.success(`Nota fiscal ${statusLabel}!`, { description: "Acompanhe em Fiscal → Histórico." });
      setNfceOpen(false);
      setCustomerDoc("");
      setCustomerName("");
    } else {
      toast.error("Falha ao emitir nota", { description: result.error || "Verifique a configuração fiscal." });
    }
  };

  if (!data) return null;

  const dateStr = data.date.toLocaleDateString("pt-BR");
  const timeStr = data.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" /> Recibo da Venda
            </DialogTitle>
          </DialogHeader>

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

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button onClick={handlePrint} className="flex-1 gap-2">
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
              {fiscalEnabled ? (
                <Button variant="outline" onClick={() => setNfceOpen(true)} className="flex-1 gap-2">
                  <FileText className="h-4 w-4" /> Emitir Nota
                </Button>
              ) : (
                <Button variant="outline" onClick={handleDownloadPdf} className="flex-1 gap-2">
                  <Download className="h-4 w-4" /> Baixar PDF
                </Button>
              )}
            </div>
            {!fiscalEnabled && (
              <Button variant="outline" onClick={handlePrintPdf} className="w-full gap-2">
                <Printer className="h-4 w-4" /> Imprimir recibo em PDF
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} className="w-full">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={nfceOpen} onOpenChange={setNfceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Emitir NFC-e
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>CPF do consumidor (opcional)</Label>
              <Input value={customerDoc} onChange={(e) => setCustomerDoc(e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <Label>Nome (opcional)</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Consumidor" />
            </div>
            <p className="text-xs text-muted-foreground">
              Configure o módulo fiscal para emitir notas. A venda funciona normalmente mesmo sem nota fiscal.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNfceOpen(false)} disabled={emitting}>Cancelar</Button>
            <Button onClick={handleEmitNfce} disabled={emitting}>
              {emitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Emitindo...</> : "Emitir Nota"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ThermalReceipt;
