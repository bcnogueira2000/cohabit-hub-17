ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS docs_validated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Só as funções de validação podem mexer nestes campos
CREATE OR REPLACE FUNCTION public.protect_lead_docs_validation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('app.lead_docs_validation', true), '') <> 'on' THEN
    NEW.docs_validated_at := OLD.docs_validated_at;
    NEW.docs_validated_by := OLD.docs_validated_by;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_protect_lead_docs_validation ON public.leads;
CREATE TRIGGER trg_protect_lead_docs_validation BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.protect_lead_docs_validation();

CREATE OR REPLACE FUNCTION public.validate_lead_docs(p_lead_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_now timestamptz := now(); v_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lead_documents WHERE lead_id = p_lead_id) THEN
    RAISE EXCEPTION 'Esta lead não tem documentos para validar.';
  END IF;
  PERFORM set_config('app.lead_docs_validation', 'on', true);
  UPDATE public.leads SET docs_validated_at = v_now, docs_validated_by = auth.uid(), updated_at = v_now WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead não encontrada'; END IF;
  PERFORM set_config('app.lead_docs_validation', 'off', true);
  SELECT full_name INTO v_name FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.lead_activity (lead_id, actor_user_id, actor_name, kind, payload)
  VALUES (p_lead_id, auth.uid(), v_name, 'docs_validated', '{}'::jsonb);
  RETURN v_now;
END $$;

CREATE OR REPLACE FUNCTION public.unvalidate_lead_docs(p_lead_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  PERFORM set_config('app.lead_docs_validation', 'on', true);
  UPDATE public.leads SET docs_validated_at = NULL, docs_validated_by = NULL, updated_at = now() WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead não encontrada'; END IF;
  PERFORM set_config('app.lead_docs_validation', 'off', true);
  SELECT full_name INTO v_name FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.lead_activity (lead_id, actor_user_id, actor_name, kind, payload)
  VALUES (p_lead_id, auth.uid(), v_name, 'docs_unvalidated', '{}'::jsonb);
END $$;

-- Versão antiga (ainda usada pela app publicada) passa a usar a nova
CREATE OR REPLACE FUNCTION public.validate_lead_documents(p_lead_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public.validate_lead_docs(p_lead_id);
END $$;

-- Estado único dos documentos da lead
CREATE OR REPLACE FUNCTION public.lead_docs_status(p_lead_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; v_count int; v_latest timestamptz; v_status text; v_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT docs_requested_at, docs_validated_at, docs_validated_by INTO l FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead não encontrada'; END IF;
  SELECT count(*), max(uploaded_at) INTO v_count, v_latest FROM public.lead_documents WHERE lead_id = p_lead_id;
  IF l.docs_validated_at IS NOT NULL AND v_count > 0 AND NOT EXISTS (
       SELECT 1 FROM public.lead_documents WHERE lead_id = p_lead_id AND uploaded_at > l.docs_validated_at) THEN
    v_status := 'validated';
  ELSIF l.docs_validated_at IS NOT NULL AND v_count > 0 THEN
    v_status := 'stale';
  ELSIF v_count > 0 THEN
    v_status := 'received';
  ELSIF l.docs_requested_at IS NOT NULL THEN
    v_status := 'requested';
  ELSE
    v_status := 'none';
  END IF;
  SELECT full_name INTO v_name FROM public.profiles WHERE user_id = l.docs_validated_by;
  RETURN jsonb_build_object('status', v_status, 'doc_count', v_count, 'latest_upload_at', v_latest,
    'validated_at', l.docs_validated_at, 'validated_by_name', v_name);
END $$;

REVOKE ALL ON FUNCTION public.validate_lead_docs(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unvalidate_lead_docs(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lead_docs_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.protect_lead_docs_validation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_lead_docs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unvalidate_lead_docs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lead_docs_status(uuid) TO authenticated;

-- Backfill: data e autor da última validação registada
SELECT set_config('app.lead_docs_validation', 'on', true);
UPDATE public.leads l SET docs_validated_at = a.created_at, docs_validated_by = a.actor_user_id
FROM (SELECT DISTINCT ON (lead_id) lead_id, created_at, actor_user_id FROM public.lead_activity
      WHERE kind = 'docs_validated' ORDER BY lead_id, created_at DESC) a
WHERE a.lead_id = l.id;
SELECT set_config('app.lead_docs_validation', 'off', true);