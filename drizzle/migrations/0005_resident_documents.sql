CREATE TABLE public.resident_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'other'
    CHECK (kind IN ('signed_contract','id_document','iban_proof','enrollment_or_work_proof','other')),
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_type text,
  notes text,
  uploaded_by uuid,
  uploaded_by_name text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resident_documents_resident_idx ON public.resident_documents(resident_id);
GRANT SELECT, INSERT ON public.resident_documents TO authenticated;
GRANT ALL ON public.resident_documents TO service_role;
ALTER TABLE public.resident_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read resident documents" ON public.resident_documents
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff add resident documents" ON public.resident_documents
  FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND uploaded_by = auth.uid());