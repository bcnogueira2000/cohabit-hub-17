CREATE TABLE public.resident_moloni_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.residents(id),
  moloni_customer_id bigint NOT NULL UNIQUE,
  customer_number text,
  vat text,
  name text,
  address text,
  zip_code text,
  city text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  valid_from date NOT NULL DEFAULT '1900-01-01',
  active_from timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  suspended_in_moloni_at timestamptz,
  suspended_marked_by uuid,
  suspended_marked_by_name text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX resident_moloni_customers_one_active ON public.resident_moloni_customers(resident_id) WHERE status = 'active';
GRANT SELECT ON public.resident_moloni_customers TO authenticated;
GRANT ALL ON public.resident_moloni_customers TO service_role;
ALTER TABLE public.resident_moloni_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read moloni customer records" ON public.resident_moloni_customers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.block_moloni_customer_record_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'As fichas Moloni do residente nunca são apagadas.'; END $$;
CREATE TRIGGER trg_block_moloni_customer_record_delete BEFORE DELETE ON public.resident_moloni_customers FOR EACH ROW EXECUTE FUNCTION public.block_moloni_customer_record_delete();

ALTER TABLE public.rent_charges ADD COLUMN moloni_customer_record_id uuid REFERENCES public.resident_moloni_customers(id);

INSERT INTO public.resident_moloni_customers (resident_id, moloni_customer_id, customer_number, vat, name, address, zip_code, city, status, valid_from, active_from)
SELECT id, moloni_customer_id, code, tax_number, full_name, address, postal_code, city, 'active', '1900-01-01', coalesce(moloni_synced_at, created_at)
FROM public.residents WHERE moloni_customer_id IS NOT NULL;

UPDATE public.rent_charges rc SET moloni_customer_record_id = r.id
FROM public.contracts c JOIN public.resident_moloni_customers r ON r.resident_id = c.resident_id
WHERE rc.contract_id = c.id AND rc.moloni_document_id IS NOT NULL;