ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS tax_number text,
  ADD COLUMN IF NOT EXISTS employer_or_school text,
  ADD COLUMN IF NOT EXISTS date_of_birth date;