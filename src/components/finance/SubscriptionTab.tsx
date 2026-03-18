import { CreditCard, CalendarDays, Receipt, Globe, Mail, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, getSubscriptionBadgeVariant, subscriptionStatusLabels } from "@/lib/billing";
import type { SubscriptionRecord } from "./types";

interface SubscriptionTabProps {
  subscription: SubscriptionRecord | null;
}

const cycleLabels: Record<string, string> = {
  monthly: "Mensal",
  yearly: "Anual",
  annual: "Anual",
  weekly: "Semanal",
};

const paymentMethodLabels: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto",
  card: "Cartão",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
};

const gatewayLabels: Record<string, string> = {
  asaas: "ASAAS",
  stripe: "Stripe",
  mercadopago: "Mercado Pago",
};

const SubscriptionTab = ({ subscription }: SubscriptionTabProps) => {
  if (!subscription) {
    return (
      <Card className="border-dashed shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Assinatura
          </CardTitle>
          <CardDescription>Nenhuma assinatura encontrada para este tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/app/subscription">Configurar assinatura</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              {subscription.plan_name}
            </CardTitle>
            <CardDescription>
              Plano atual com cobrança {cycleLabels[subscription.billing_cycle] || subscription.billing_cycle?.toLowerCase() || "recorrente"}.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getSubscriptionBadgeVariant(subscription.status)}>
              {subscriptionStatusLabels[subscription.status] || subscription.status}
            </Badge>
            <Button asChild variant="outline">
              <a href="/app/subscription">Gerenciar</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Valor do plano</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-3xl font-bold">{formatCurrency(subscription.plan_price, subscription.currency)}</span>
              <span className="pb-1 text-sm text-muted-foreground">/{cycleLabels[subscription.billing_cycle]?.toLowerCase() || subscription.billing_cycle}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <InfoCard icon={CalendarDays} label="Próxima cobrança" value={formatDate(subscription.next_billing_date)} />
            <InfoCard icon={Receipt} label="Fim do trial" value={formatDate(subscription.trial_end)} />
            <InfoCard icon={Globe} label="Gateway / País" value={`${gatewayLabels[subscription.gateway] || subscription.gateway} • ${subscription.customer_country || "—"}`} />
            <InfoCard icon={Mail} label="E-mail de cobrança" value={subscription.customer_email || "—"} />
            <InfoCard label="Forma preferida" value={paymentMethodLabels[subscription.preferred_payment_method || ""] || subscription.preferred_payment_method || "—"} />
            <InfoCard label="Atualizada em" value={formatDate(subscription.updated_at)} />
          </div>

          {subscription.status === "trial" && subscription.trial_end && (
            <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
              <CircleAlert className="mt-0.5 h-4 w-4 text-warning" />
              <p>
                Seu período de teste vai até <strong>{formatDate(subscription.trial_end)}</strong>. Após isso, a cobrança será gerada automaticamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const InfoCard = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof CreditCard;
}) => (
  <div className="rounded-lg border border-border bg-background p-4">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span>{label}</span>
    </div>
    <p className="mt-2 text-sm font-semibold break-words">{value}</p>
  </div>
);

export default SubscriptionTab;
