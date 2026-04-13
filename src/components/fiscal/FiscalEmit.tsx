import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { fiscalService } from "@/lib/fiscalService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const FiscalEmit = () => {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [emitting, setEmitting] = useState(false);
  const [form, setForm] = useState({
    type: "nfce" as "nfe" | "nfce",
    customerName: "",
    customerDocument: "",
    customerEmail: "",
    customerAddress: "",
    amount: "",
  });

  const handleEmit = async () => {
    if (!tenantId) return;
    if (!form.amount || Number(form.amount) <= 0) {
      toast({ title: "Informe o valor da nota", variant: "destructive" });
      return;
    }

    setEmitting(true);
    const result = await fiscalService.emitInvoice({
      tenantId,
      type: form.type,
      customerName: form.customerName || undefined,
      customerDocument: form.customerDocument || undefined,
      customerEmail: form.customerEmail || undefined,
      customerAddress: form.customerAddress || undefined,
      amount: Number(form.amount),
    });
    setEmitting(false);

    if (result.success) {
      toast({ title: "Nota fiscal registrada", description: "Status: pendente. Será processada quando a API fiscal for configurada." });
      setForm({ type: "nfce", customerName: "", customerDocument: "", customerEmail: "", customerAddress: "", amount: "" });
    } else {
      toast({ title: "Erro ao emitir", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Módulo fiscal preparado para integração com API externa (Focus NFe, Enotas, Webmania). 
          Configure a chave de API nas configurações para ativar a emissão automática.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Emitir Nota Fiscal</CardTitle>
          <CardDescription>Preencha os dados para emissão de NF-e ou NFC-e</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Nota</Label>
              <Select value={form.type} onValueChange={(v: "nfe" | "nfce") => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nfce">NFC-e (Consumidor)</SelectItem>
                  <SelectItem value="nfe">NF-e (Empresa)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>CPF/CNPJ do Cliente</Label>
              <Input value={form.customerDocument} onChange={(e) => setForm({ ...form, customerDocument: e.target.value })} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label>Nome do Cliente</Label>
              <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} placeholder="Opcional (obrigatório para NF-e)" />
            </div>
          </div>

          <Button onClick={handleEmit} disabled={emitting} className="w-full md:w-auto">
            <FileText className="h-4 w-4 mr-2" />
            {emitting ? "Emitindo..." : "Emitir Nota Fiscal"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default FiscalEmit;
