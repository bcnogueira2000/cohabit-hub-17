ALTER TABLE public.payments ALTER COLUMN contract_id DROP NOT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD CONSTRAINT payments_contract_or_lead CHECK (
  (contract_id IS NOT NULL AND lead_id IS NULL) OR (contract_id IS NULL AND lead_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS payments_lead_id_idx ON public.payments(lead_id);

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS planned_check_in date;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS planned_check_out date;