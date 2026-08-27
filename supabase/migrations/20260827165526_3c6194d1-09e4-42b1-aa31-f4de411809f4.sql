ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS emergency_contact_email text;