ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS reservation_deadline date,
  ADD COLUMN IF NOT EXISTS reservation_fee_amount numeric(10,2) DEFAULT 200;