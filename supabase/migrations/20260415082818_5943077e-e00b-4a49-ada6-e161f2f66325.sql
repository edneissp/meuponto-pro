
-- Add paid_amount for partial payment support
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0;

-- Add payment_status for richer status tracking
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

-- Backfill: if already paid, set paid_amount = amount and payment_status = 'paid'
UPDATE public.expenses SET paid_amount = amount, payment_status = 'paid' WHERE paid = true;

-- Backfill: check overdue
UPDATE public.expenses SET payment_status = 'overdue' WHERE paid = false AND due_date IS NOT NULL AND due_date < CURRENT_DATE;
