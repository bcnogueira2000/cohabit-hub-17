ALTER TABLE public.residents
  ADD COLUMN moloni_customer_id integer,
  ADD COLUMN moloni_synced_at timestamp with time zone;

ALTER TABLE public.rent_charges
  ADD COLUMN moloni_document_id bigint,
  ADD COLUMN moloni_document_number text,
  ADD COLUMN moloni_status text,
  ADD COLUMN moloni_issued_at timestamp with time zone,
  ADD COLUMN moloni_paid_synced_at timestamp with time zone;

CREATE INDEX rent_charges_moloni_document_id_idx ON public.rent_charges (moloni_document_id);