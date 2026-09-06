ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS course text,
  ADD COLUMN IF NOT EXISTS course_duration text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relation text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_email text,
  ADD COLUMN IF NOT EXISTS candidate_comments text,
  ADD COLUMN IF NOT EXISTS public_token text,
  ADD COLUMN IF NOT EXISTS public_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS form_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS short_name text;

CREATE UNIQUE INDEX IF NOT EXISTS leads_public_token_key ON public.leads (public_token) WHERE public_token IS NOT NULL;

ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS course text,
  ADD COLUMN IF NOT EXISTS course_duration text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relation text,
  ADD COLUMN IF NOT EXISTS short_name text;

CREATE OR REPLACE FUNCTION public.compute_short_name(p_full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  parts text[];
BEGIN
  parts := regexp_split_to_array(btrim(coalesce(p_full_name, '')), '\s+');
  parts := array_remove(parts, '');
  IF parts IS NULL OR array_length(parts, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  IF array_length(parts, 1) = 1 THEN
    RETURN parts[1];
  END IF;
  RETURN parts[1] || ' ' || parts[array_length(parts, 1)];
END;
$$;

CREATE OR REPLACE FUNCTION public.set_short_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.short_name := public.compute_short_name(NEW.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_short_name ON public.leads;
CREATE TRIGGER trg_leads_short_name
BEFORE INSERT OR UPDATE OF full_name ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_short_name();

DROP TRIGGER IF EXISTS trg_residents_short_name ON public.residents;
CREATE TRIGGER trg_residents_short_name
BEFORE INSERT OR UPDATE OF full_name ON public.residents
FOR EACH ROW EXECUTE FUNCTION public.set_short_name();

UPDATE public.leads SET short_name = public.compute_short_name(full_name) WHERE short_name IS NULL;
UPDATE public.residents SET short_name = public.compute_short_name(full_name) WHERE short_name IS NULL;

CREATE TABLE IF NOT EXISTS public.lead_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_type text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_documents TO authenticated;
GRANT ALL ON public.lead_documents TO service_role;

ALTER TABLE public.lead_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage lead documents"
ON public.lead_documents FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS lead_documents_lead_id_idx ON public.lead_documents (lead_id);