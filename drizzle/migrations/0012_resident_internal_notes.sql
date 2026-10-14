CREATE TABLE public.resident_internal_notes (
  resident_id uuid PRIMARY KEY REFERENCES public.residents(id) ON DELETE CASCADE,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resident_internal_notes TO authenticated;
GRANT ALL ON public.resident_internal_notes TO service_role;
ALTER TABLE public.resident_internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage resident internal notes" ON public.resident_internal_notes FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER resident_internal_notes_updated_at BEFORE UPDATE ON public.resident_internal_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.resident_internal_notes (resident_id, notes, updated_by)
SELECT id, internal_notes, NULL FROM public.residents WHERE trim(coalesce(internal_notes, '')) <> '';

COMMENT ON COLUMN public.residents.internal_notes IS 'DEPRECATED: replaced by resident_internal_notes (staff-only). Always empty.';

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    IF NEW.account_status IS DISTINCT FROM OLD.account_status
       OR NEW.resident_id IS DISTINCT FROM OLD.resident_id
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Não podes alterar o estado da conta, o residente associado, o email ou o utilizador';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_profiles_protect_fields BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();