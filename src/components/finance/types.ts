export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  due_date: string | null;
  paid: boolean;
  paid_at: string | null;
  supplier_id: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export interface SubscriptionRecord {
  id: string;
  plan_name: string;
  plan_price: number;
  currency: string;
  billing_cycle: string;
  status: string;
  gateway: string;
  next_billing_date: string | null;
  trial_end: string | null;
  customer_email: string | null;
  customer_country: string | null;
  preferred_payment_method: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  invoice_url: string | null;
  download_url: string | null;
  payment_gateway: string;
  created_at: string;
}

export type Period = "daily" | "weekly" | "monthly";

export interface SummaryStats {
  revenue: number;
  costs: number;
  expenses: number;
  profit: number;
  margin: number;
  pending: number;
}
