import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { fiscalService } from "@/lib/fiscalService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, XCircle, FileText, Eye } from "lucide-react";

interface FiscalDoc {
  id: string;
  type: string;
  number: string | null;
  customer_name: string | null;
  customer_document: string | null;
  amount: number;
  status: string;
  pdf_url: string | null;
  xml_url: string | null;
  cancel_reason: string | null;
  error_message: string | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  issued: { label: "Emitida", variant: "default" },
  canceled: { label: "Cancelada", variant: "destructive" },
  error: { label: "Erro", variant: "destructive" },
};

const FiscalHistory = () => {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [docs, setDocs] = useState<FiscalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialog, setCancelDialog] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const fetchDocs = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("fiscal_documents" as any)
      .select("id, type, number, customer_name, customer_document, amount, status, pdf_url, xml_url, cancel_reason, error_message, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(100);
    setDocs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [tenantId]);

  const handleCancel = async () => {
    if (!cancelDialog || !cancelReason.trim()) {
      toast({ title: "Informe o motivo do cancelamento", variant: "destructive" });
      return;
    }
    const result = await fiscalService.cancelInvoice(cancelDialog, cancelReason);
    if (result.success) {
      toast({ title: "Nota cancelada" });
      setCancelDialog(null);
      setCancelReason("");
      fetchDocs();
    } else {
      toast({ title: "Erro ao cancelar", description: result.error, variant: "destructive" });
    }
  };

  // Summary
  const summary = {
    total: docs.length,
    issued: docs.filter((d) => d.status === "issued").length,
    canceled: docs.filter((d) => d.status === "canceled").length,
    errors: docs.filter((d) => d.status === "error").length,
    totalAmount: docs.filter((d) => d.status === "issued").reduce((s, d) => s + Number(d.amount), 0),
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{summary.total}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Emitidas</p><p className="text-xl font-bold text-green-600">{summary.issued}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Canceladas</p><p className="text-xl font-bold text-destructive">{summary.canceled}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Erros</p><p className="text-xl font-bold text-amber-500">{summary.errors}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Valor Fiscalizado</p><p className="text-lg font-bold">R$ {summary.totalAmount.toFixed(2)}</p></CardContent></Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Histórico de Notas Fiscais</CardTitle></CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Nenhuma nota fiscal registrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => {
                    const st = STATUS_BADGE[doc.status] || STATUS_BADGE.pending;
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="uppercase font-medium">{doc.type}</TableCell>
                        <TableCell>{doc.number || "—"}</TableCell>
                        <TableCell>{doc.customer_name || "—"}</TableCell>
                        <TableCell>{doc.customer_document || "—"}</TableCell>
                        <TableCell>R$ {Number(doc.amount).toFixed(2)}</TableCell>
                        <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                        <TableCell>{new Date(doc.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {doc.pdf_url && (
                              <Button size="icon" variant="ghost" asChild title="Baixar DANFE">
                                <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                              </Button>
                            )}
                            {doc.xml_url && (
                              <Button size="icon" variant="ghost" asChild title="Baixar XML">
                                <a href={doc.xml_url} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></a>
                              </Button>
                            )}
                            {(doc.status === "issued" || doc.status === "pending") && (
                              <Button size="icon" variant="ghost" onClick={() => setCancelDialog(doc.id)} title="Cancelar nota">
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={() => { setCancelDialog(null); setCancelReason(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar Nota Fiscal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Motivo do cancelamento</Label>
            <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Informe o motivo" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancel}>Confirmar Cancelamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FiscalHistory;
