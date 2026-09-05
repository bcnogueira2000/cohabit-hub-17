ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS draft_rent_amount numeric,
  ADD COLUMN IF NOT EXISTS draft_deposit_due numeric,
  ADD COLUMN IF NOT EXISTS draft_payment_day integer,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS employer_or_school text;