ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS leads_contract_id_idx ON public.leads (contract_id);