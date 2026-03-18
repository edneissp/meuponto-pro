export const subscriptionStatusLabels: Record<string, string> = {
  active: "Ativa",
  trial: "Trial",
  past_due: "Em atraso",
  suspended: "Suspensa",
  canceled: "Cancelada",
};

export const invoiceStatusLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Paga",
  overdue: "Vencida",
  canceled: "Cancelada",
};

export const deliveryStatusLabels: Record<string, string> = {
  received: "Recebida",
  processing: "Em processamento",
  completed: "Concluída",
  canceled: "Cancelada",
};

export const paymentStatusLabels: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
};

export const currencyLocales: Record<string, string> = {
  BRL: "pt-BR",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
};

export const getSubscriptionBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "active") return "default";
  if (status === "trial") return "secondary";
  if (status === "past_due" || status === "suspended") return "destructive";
  return "outline";
};

export const getInvoiceBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "paid") return "default";
  if (status === "pending") return "secondary";
  if (status === "overdue") return "destructive";
  return "outline";
};

export const getDeliveryBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "completed") return "default";
  if (status === "processing") return "secondary";
  if (status === "canceled") return "destructive";
  return "outline";
};

export const getPaymentBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "paid") return "default";
  if (status === "partial") return "secondary";
  return "outline";
};

export const formatCurrency = (amount: number, currency: string = "BRL") => {
  const locale = currencyLocales[currency] || "pt-BR";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
};

export const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
};

export const formatCurrencyGroups = (entries: Array<{ amount: number; currency: string }>) => {
  const totals = entries.reduce<Record<string, number>>((acc, entry) => {
    const currency = entry.currency || "BRL";
    acc[currency] = (acc[currency] || 0) + Number(entry.amount || 0);
    return acc;
  }, {});

  const groups = Object.entries(totals).filter(([, amount]) => amount > 0);
  if (groups.length === 0) return formatCurrency(0, "BRL");

  return groups
    .map(([currency, amount]) => formatCurrency(amount, currency))
    .join(" • ");
};
