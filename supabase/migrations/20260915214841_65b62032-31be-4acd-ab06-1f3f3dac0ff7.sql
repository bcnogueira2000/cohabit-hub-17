ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS emergency_contact_invoice_copy boolean NOT NULL DEFAULT false;