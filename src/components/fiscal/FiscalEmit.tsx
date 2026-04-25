import { useEffect, useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { fiscalService } from "@/lib/fiscalService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  checkTenantFiscalReady,
  isValidCpfCnpj,
  isValidCNPJ,
  onlyDigits,
} from "@/lib/fiscalValidation";

const FiscalEmit = () => {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [emitting, setEmitting] = useState(false);
  const [readyCheck, setReadyCheck] = useState<{ ok: boolean; missing: string[]; fiscalEnabled: boolean } | null>(null);
  const [form, setForm] = useState({
    type: "nfce" as "nfe" | "nfce",
    customerName: "",
    customerDocument: "",
    customerEmail: "",
    customerAddress: "",
    amount: "",
  });

  useEffect(() => {
    if (!tenantId) return;
    checkTenantFiscalReady(tenantId).then((r) =>
      setReadyCheck({ ok: r.ok, missing: r.missing, fiscalEnabled: r.fiscalEnabled })
    );
  }, [tenantId]);

  const validateBeforeEmit = (): string | null => {
    if (!form.amount || Number(form.amount) <= 0) return "Informe um valor maior que zero.";

    const docDigits = onlyDigits(form.customerDocument);

    if (form.type === "nfe") {
      // NF-e exige destinatário identificado
      if (!docDigits) return "NF-e exige CPF ou CNPJ do destinatário.";
      if (!isValidCpfCnpj(docDigits)) return "CPF/CNPJ do destinatário é inválido.";
      if (!form.customerName.trim()) return "NF-e exige o nome/razão social do destinatário.";
      if (!form.customerAddress.trim()) return "NF-e exige o endereço do destinatário.";
      // Para NF-e com CNPJ destinatário, validar dígitos
      if (docDigits.length === 14 && !isValidCNPJ(docDigits)) return "CNPJ do destinatário é inválido.";
    } else if (docDigits) {
      // NFC-e: documento é opcional, mas se informado precisa ser válido
      if (!isValidCpfCnpj(docDigits)) return "CPF/CNPJ informado é inválido.";
    }

    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) {
      return "E-mail do destinatário é inválido.";
    }

    return null;
  };

  const handleEmit = async () => {
    if (!tenantId) return;

    // 1) Tenant pronto? (CNPJ, endereço, regime, API key…)
    const ready = await checkTenantFiscalReady(tenantId);
    setReadyCheck({ ok: ready.ok, missing: ready.missing, fiscalEnabled: ready.fiscalEnabled });
    if (!ready.ok) {
      toast({
        title: "Módulo fiscal inativo",
        description: "Configure o módulo fiscal para emitir notas.",
        variant: "destructive",
      });
      return;
    }

    // 2) Formulário válido?
    const formError = validateBeforeEmit();
    if (formError) {
      toast({ title: "Dados inválidos", description: formError, variant: "destructive" });
      return;
    }

    setEmitting(true);
    const result = await fiscalService.emitInvoice({
      tenantId,
      type: form.type,
      customerName: form.customerName || undefined,
      customerDocument: form.customerDocument ? onlyDigits(form.customerDocument) : undefined,
      customerEmail: form.customerEmail || undefined,
      customerAddress: form.customerAddress || undefined,
      amount: Number(form.amount),
    });
    setEmitting(false);

    if (result.success) {
      const status = (result as any).status;
      const label = status === "issued" ? "autorizada pela SEFAZ ✅" : status === "processing" ? "em processamento (acompanhe no histórico)" : "registrada";
      toast({ title: `Nota fiscal ${label}` });
      setForm({ type: "nfce", customerName: "", customerDocument: "", customerEmail: "", customerAddress: "", amount: "" });
    } else {
      toast({ title: "Erro ao emitir", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {readyCheck && !readyCheck.ok ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Configure o módulo fiscal para emitir notas.</strong> Faltando: {readyCheck.missing.join(", ")}.
          </AlertDescription>
        </Alert>
      ) : readyCheck?.ok ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Configuração fiscal completa. Você já pode emitir NF-e e NFC-e via Focus NFe.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Emissão integrada com Focus NFe. Configure a API Key e os dados fiscais da empresa antes de emitir notas reais.
          </AlertDescription>
        </Alert>
      )}

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

          <Button onClick={handleEmit} disabled={emitting || !readyCheck?.ok} className="w-full md:w-auto">
            <FileText className="h-4 w-4 mr-2" />
            {emitting ? "Emitindo..." : readyCheck?.ok ? "Emitir Nota Fiscal" : "Configure o módulo fiscal para emitir notas"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default FiscalEmit;
