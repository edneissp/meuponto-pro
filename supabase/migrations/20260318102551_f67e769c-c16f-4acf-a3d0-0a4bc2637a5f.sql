ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_payment_method_check;

ALTER TABLE public.sales
ADD CONSTRAINT sales_payment_method_check
CHECK (payment_method = ANY (ARRAY['cash'::text, 'pix'::text, 'credit_card'::text, 'debit_card'::text, 'fiado'::text]));