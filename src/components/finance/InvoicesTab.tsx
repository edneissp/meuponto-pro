import { Download, ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatCurrency,
  formatCurrencyGroups,
  formatDate,
  getInvoiceBadgeVariant,
  invoiceStatusLabels,
} from "@/lib/billing";
import type { InvoiceRecord } from "./types";

interface InvoicesTabProps {
  invoices: InvoiceRecord[];
}

const InvoicesTab = ({ invoices }: InvoicesTabProps) => {
  const totals = {
    pending: invoices.filter((invoice) => invoice.status === "pending"),
    overdue: invoices.filter((invoice) => invoice.status === "overdue"),
    paid: invoices.filter((invoice) => invoice.status === "paid"),
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Em aberto"
          value={formatCurrencyGroups(totals.pending.map((invoice) => ({ amount: invoice.amount, currency: invoice.currency })))}
        />
        <SummaryCard
          title="Vencidas"
          value={formatCurrencyGroups(totals.overdue.map((invoice) => ({ amount: invoice.amount, currency: invoice.currency })))}
        />
        <SummaryCard
          title="Pagas"
          value={formatCurrencyGroups(totals.paid.map((invoice) => ({ amount: invoice.amount, currency: invoice.currency })))}
        />
      </div>

      {invoices.length === 0 ? (
        <Card className="border-dashed shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Faturas
            </CardTitle>
            <CardDescription>Nenhuma fatura disponível no momento.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="shadow-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">Vencimento: {formatDate(invoice.due_date)}</p>
                    </div>
                    <Badge variant={getInvoiceBadgeVariant(invoice.status)}>
                      {invoiceStatusLabels[invoice.status] || invoice.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Valor</span>
                    <span className="font-semibold">{formatCurrency(invoice.amount, invoice.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pago em</span>
                    <span>{formatDate(invoice.paid_at)}</span>
                  </div>
                  <InvoiceActions invoice={invoice} />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hidden md:block shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fatura</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{invoice.payment_gateway}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getInvoiceBadgeVariant(invoice.status)}>
                        {invoiceStatusLabels[invoice.status] || invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell>{formatDate(invoice.paid_at)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
                    <TableCell className="text-right">
                      <InvoiceActions invoice={invoice} alignEnd />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
};

const SummaryCard = ({ title, value }: { title: string; value: string }) => (
  <Card className="shadow-card">
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </CardContent>
  </Card>
);

const InvoiceActions = ({ invoice, alignEnd = false }: { invoice: InvoiceRecord; alignEnd?: boolean }) => (
  <div className={`flex flex-wrap gap-2 ${alignEnd ? "justify-end" : ""}`}>
    {invoice.invoice_url && (
      <Button variant="outline" size="sm" asChild>
        <a href={invoice.invoice_url} target="_blank" rel="noreferrer">
          <ExternalLink className="h-4 w-4" />
          Abrir
        </a>
      </Button>
    )}
    {invoice.download_url && (
      <Button variant="outline" size="sm" asChild>
        <a href={invoice.download_url} target="_blank" rel="noreferrer">
          <Download className="h-4 w-4" />
          Baixar
        </a>
      </Button>
    )}
  </div>
);

export default InvoicesTab;
