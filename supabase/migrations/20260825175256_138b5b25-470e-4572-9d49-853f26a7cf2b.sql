ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS document_validity date,
  ADD COLUMN IF NOT EXISTS tax_number text,
  ADD COLUMN IF NOT EXISTS reservation_deadline date,
  ADD COLUMN IF NOT EXISTS reservation_fee_amount numeric(10,2) DEFAULT 200;