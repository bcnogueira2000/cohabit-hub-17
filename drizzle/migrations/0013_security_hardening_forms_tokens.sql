-- A) Fim dos formulários públicos anónimos
DROP POLICY IF EXISTS "public insert requests" ON public.requests;
DROP POLICY IF EXISTS "public insert stays" ON public.stays;
REVOKE INSERT ON public.requests, public.stays FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

ALTER TABLE public.requests ADD CONSTRAINT requests_title_len CHECK (char_length(title) <= 200) NOT VALID;
ALTER TABLE public.requests ADD CONSTRAINT requests_description_len CHECK (char_length(coalesce(description,'')) <= 4000) NOT VALID;

UPDATE public.notifications SET read_at = now() WHERE read_at IS NULL AND created_at < now() - interval '7 days';

-- B) Formulários com token
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS docs_review_email_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.get_lead_form_data(p_token text)
 RETURNS TABLE(full_name text, email text, phone text, nationality text, date_of_birth date, document_type text, document_number text, document_validity date, tax_number text, address text, postal_code text, city text, profile text, employer_or_school text, course text, course_duration text, job_title text, emergency_contact_name text, emergency_contact_relation text, emergency_contact_phone text, emergency_contact_email text, candidate_comments text, gdpr_consent boolean, language text, form_submitted_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT l.full_name, l.email, l.phone, l.nationality, l.date_of_birth,
         l.document_type,
         CASE WHEN l.form_submitted_at IS NOT NULL AND l.document_number IS NOT NULL
              THEN repeat('•', greatest(char_length(l.document_number)-3,0)) || right(l.document_number,3)
              ELSE l.document_number END,
         l.document_validity,
         CASE WHEN l.form_submitted_at IS NOT NULL AND l.tax_number IS NOT NULL
              THEN repeat('•', greatest(char_length(l.tax_number)-3,0)) || right(l.tax_number,3)
              ELSE l.tax_number END,
         l.address, l.postal_code, l.city, l.profile,
         l.employer_or_school, l.course, l.course_duration, l.job_title,
         l.emergency_contact_name, l.emergency_contact_relation,
         l.emergency_contact_phone, l.emergency_contact_email,
         l.candidate_comments, l.gdpr_consent, l.language, l.form_submitted_at
    FROM public.leads l
   WHERE l.public_token = p_token
     AND l.public_token_expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Este link expirou ou é inválido';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_lead_form(p_token text, p_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id uuid;
  v_submitted timestamptz;
BEGIN
  IF pg_column_size(p_data) > 20000 THEN
    RAISE EXCEPTION 'Dados do formulário demasiado grandes';
  END IF;

  SELECT id, form_submitted_at INTO v_lead_id, v_submitted
    FROM public.leads
   WHERE public_token = p_token
     AND public_token_expires_at > now();

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Este link expirou ou é inválido';
  END IF;

  IF v_submitted IS NOT NULL AND v_submitted < now() - interval '24 hours' THEN
    RAISE EXCEPTION 'O formulário já foi submetido. Contacta a equipa para alterações.';
  END IF;

  UPDATE public.leads SET
    full_name = COALESCE(NULLIF(p_data->>'full_name',''), full_name),
    phone = COALESCE(NULLIF(p_data->>'phone',''), phone),
    nationality = COALESCE(NULLIF(p_data->>'nationality',''), nationality),
    date_of_birth = COALESCE((NULLIF(p_data->>'date_of_birth',''))::date, date_of_birth),
    gender = COALESCE(NULLIF(p_data->>'gender',''), gender),
    address = COALESCE(NULLIF(p_data->>'address',''), address),
    postal_code = COALESCE(NULLIF(p_data->>'postal_code',''), postal_code),
    city = COALESCE(NULLIF(p_data->>'city',''), city),
    document_type = COALESCE(NULLIF(p_data->>'document_type',''), document_type),
    document_number = CASE WHEN position('•' in coalesce(p_data->>'document_number','')) > 0 THEN document_number ELSE COALESCE(NULLIF(p_data->>'document_number',''), document_number) END,
    document_validity = COALESCE((NULLIF(p_data->>'document_validity',''))::date, document_validity),
    tax_number = CASE WHEN position('•' in coalesce(p_data->>'tax_number','')) > 0 THEN tax_number ELSE COALESCE(NULLIF(p_data->>'tax_number',''), tax_number) END,
    profile = COALESCE(NULLIF(p_data->>'profile',''), profile),
    course = COALESCE(NULLIF(p_data->>'course',''), course),
    course_duration = COALESCE(NULLIF(p_data->>'course_duration',''), course_duration),
    employer_or_school = COALESCE(NULLIF(p_data->>'employer_or_school',''), employer_or_school),
    job_title = COALESCE(NULLIF(p_data->>'job_title',''), job_title),
    emergency_contact_name = COALESCE(NULLIF(p_data->>'emergency_contact_name',''), emergency_contact_name),
    emergency_contact_relation = COALESCE(NULLIF(p_data->>'emergency_contact_relation',''), emergency_contact_relation),
    emergency_contact_phone = COALESCE(NULLIF(p_data->>'emergency_contact_phone',''), emergency_contact_phone),
    emergency_contact_email = COALESCE(NULLIF(p_data->>'emergency_contact_email',''), emergency_contact_email),
    candidate_comments = COALESCE(NULLIF(p_data->>'candidate_comments',''), candidate_comments),
    gdpr_consent = COALESCE((p_data->>'gdpr_consent')::boolean, gdpr_consent),
    form_submitted_at = COALESCE(form_submitted_at, now()),
    updated_at = now()
  WHERE id = v_lead_id;

  INSERT INTO public.lead_activity (lead_id, actor_name, kind, payload)
  VALUES (v_lead_id, 'Candidato', 'form_submitted', jsonb_build_object('fields', (SELECT coalesce(jsonb_agg(k), '[]'::jsonb) FROM jsonb_object_keys(p_data) k)));

  RETURN v_lead_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.register_lead_document(p_token text, p_file_name text, p_storage_path text, p_file_type text, p_kind text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_lead_id uuid; v_doc_id uuid;
BEGIN
  v_lead_id := public.lead_id_for_form_token(p_token);
  IF p_storage_path IS NULL OR left(p_storage_path, char_length(v_lead_id::text) + 1) <> v_lead_id::text || '/' THEN
    RAISE EXCEPTION 'Caminho de ficheiro inválido';
  END IF;
  IF position('..' in p_storage_path) > 0 THEN
    RAISE EXCEPTION 'Caminho de ficheiro inválido';
  END IF;
  IF (SELECT count(*) FROM public.lead_documents WHERE lead_id = v_lead_id) >= 20 THEN
    RAISE EXCEPTION 'Limite de documentos atingido. Contacta a equipa.';
  END IF;
  IF p_kind IS NOT NULL AND p_kind NOT IN ('id_document','iban_proof','enrollment_or_work_proof','other') THEN
    RAISE EXCEPTION 'Tipo de documento inválido';
  END IF;
  INSERT INTO public.lead_documents (lead_id, file_name, storage_path, file_type, kind)
  VALUES (v_lead_id, p_file_name, p_storage_path, p_file_type, p_kind)
  RETURNING id INTO v_doc_id;
  RETURN v_doc_id;
END $function$;

CREATE OR REPLACE FUNCTION public.submit_lead_documents(p_token text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_lead public.leads; v_item text; v_now timestamptz := now();
BEGIN
  SELECT * INTO v_lead FROM public.leads
   WHERE public_token = p_token AND public_token_expires_at > now() FOR UPDATE;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'Este link expirou ou é inválido'; END IF;
  IF v_lead.docs_requested_at IS NULL OR coalesce(array_length(v_lead.docs_request_items,1),0) = 0 THEN
    RAISE EXCEPTION 'Não há nenhum pedido de documentos ativo';
  END IF;
  FOREACH v_item IN ARRAY v_lead.docs_request_items LOOP
    IF NOT EXISTS (SELECT 1 FROM public.lead_documents d
                    WHERE d.lead_id = v_lead.id AND d.kind = v_item
                      AND d.uploaded_at >= v_lead.docs_requested_at) THEN
      RAISE EXCEPTION 'Falta carregar um dos documentos pedidos (%)', v_item;
    END IF;
  END LOOP;

  UPDATE public.leads SET docs_received_at = v_now, docs_review_email_sent_at = NULL, updated_at = v_now WHERE id = v_lead.id;

  INSERT INTO public.lead_activity (lead_id, kind, payload)
  VALUES (v_lead.id, 'docs_received', jsonb_build_object('items', to_jsonb(v_lead.docs_request_items)));

  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT ur.user_id, 'docs_received', 'Documentos recebidos: ' || v_lead.full_name,
         'O candidato enviou os documentos pedidos.', '/leads'
    FROM public.user_roles ur WHERE ur.role IN ('staff','manager','admin') GROUP BY ur.user_id;

  BEGIN
    PERFORM net.http_post(
      url := 'https://rjwyxssxbknyhsnnirhq.supabase.co/functions/v1/notificar-formulario-preenchido',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('lead_id', v_lead.id, 'kind', 'documents'));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'submit_lead_documents: email não enviado (%)', SQLERRM;
  END;
  RETURN v_now;
END $function$;

CREATE OR REPLACE FUNCTION public.evaluate_lead_won(p_lead_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead public.leads;
  v_contract public.contracts;
  v_deposit_paid numeric;
  v_first_outstanding numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF v_lead.id IS NULL OR v_lead.status <> 'reserved' OR v_lead.contract_signed_at IS NULL THEN
    RETURN false;
  END IF;
  SELECT * INTO v_contract FROM public.contracts
   WHERE id = v_lead.contract_id OR (v_lead.contract_id IS NULL AND lead_id = p_lead_id)
   ORDER BY created_at DESC LIMIT 1;
  IF v_contract.id IS NULL THEN RETURN false; END IF;
  SELECT COALESCE(sum(amount), 0) INTO v_deposit_paid
    FROM public.payments WHERE contract_id = v_contract.id AND kind = 'deposit' AND status = 'active';
  IF COALESCE(v_contract.deposit_due, 0) > 0.005 AND v_deposit_paid + 0.005 < v_contract.deposit_due THEN
    RETURN false;
  END IF;
  SELECT outstanding INTO v_first_outstanding
    FROM public.rent_charge_balance WHERE contract_id = v_contract.id ORDER BY year, month LIMIT 1;
  IF v_first_outstanding IS NULL OR v_first_outstanding > 0.005 THEN
    RETURN false;
  END IF;
  UPDATE public.leads SET status = 'won', updated_at = now() WHERE id = p_lead_id AND status = 'reserved';
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.compute_rent_for_month(p_contract_id uuid, p_year integer, p_month integer, OUT o_amount numeric, OUT o_prorated boolean, OUT o_due_date date)
 RETURNS record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start date;
  v_end date;
  v_payment_day int;
  v_month_start date;
  v_month_end date;
  v_cover_start date;
  v_cover_end date;
  v_days_in_month int;
  v_day date;
  v_rate numeric;
  v_first_rate numeric;
  v_distinct_rates int := 0;
  v_prev_rate numeric;
  v_sum numeric := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  SELECT c.start_date, COALESCE(c.actual_end_date, c.end_date), c.payment_day
    INTO v_start, v_end, v_payment_day
  FROM public.contracts c WHERE c.id = p_contract_id;

  IF v_start IS NULL THEN
    RETURN;
  END IF;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month - 1 day')::date;
  v_days_in_month := EXTRACT(DAY FROM v_month_end)::int;

  v_cover_start := GREATEST(v_start, v_month_start);
  v_cover_end := LEAST(v_end, v_month_end);

  IF v_cover_start > v_cover_end THEN
    RETURN; -- mês fora do contrato
  END IF;

  v_day := v_cover_start;
  WHILE v_day <= v_cover_end LOOP
    SELECT rp.monthly_amount INTO v_rate
    FROM public.contract_rent_periods rp
    WHERE rp.contract_id = p_contract_id AND rp.valid_from <= v_day
    ORDER BY rp.valid_from DESC
    LIMIT 1;

    IF v_rate IS NULL THEN
      SELECT rp.monthly_amount INTO v_rate
      FROM public.contract_rent_periods rp
      WHERE rp.contract_id = p_contract_id
      ORDER BY rp.valid_from ASC
      LIMIT 1;
    END IF;

    IF v_rate IS NULL THEN
      RETURN;
    END IF;

    IF v_prev_rate IS NULL OR v_rate <> v_prev_rate THEN
      v_distinct_rates := v_distinct_rates + 1;
      v_prev_rate := v_rate;
    END IF;
    IF v_first_rate IS NULL THEN
      v_first_rate := v_rate;
    END IF;

    v_sum := v_sum + (v_rate / v_days_in_month);
    v_day := v_day + 1;
  END LOOP;

  IF v_cover_start = v_month_start
     AND v_cover_end = v_month_end
     AND v_distinct_rates = 1 THEN
    o_amount := ROUND(v_first_rate, 2);
    o_prorated := false;
  ELSE
    o_amount := ROUND(v_sum, 2);
    o_prorated := true;
  END IF;

  o_due_date := LEAST(
    v_cover_end,
    GREATEST(
      v_cover_start,
      make_date(p_year, p_month, LEAST(GREATEST(COALESCE(v_payment_day, 5), 1), v_days_in_month))
    )
  );
END;
$function$;

-- D) Hardening
REVOKE EXECUTE ON FUNCTION public.generate_finance_alerts() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "staff write contract templates" ON storage.objects;
DROP POLICY IF EXISTS "staff update contract templates" ON storage.objects;
DROP POLICY IF EXISTS "staff delete contract templates" ON storage.objects;
CREATE POLICY "managers write contract templates" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contract-templates' AND (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "managers update contract templates" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'contract-templates' AND (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')))
  WITH CHECK (bucket_id = 'contract-templates' AND (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "managers delete contract templates" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contract-templates' AND (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')));

DROP POLICY IF EXISTS "resident delete own documents" ON storage.objects;
CREATE POLICY "staff delete resident documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resident-documents' AND public.is_staff(auth.uid()));

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

COMMENT ON COLUMN public.residents.internal_notes IS 'DEPRECATED: replaced by resident_internal_notes; kept empty, not used by the app';

-- net.*: as funções que as chamam são SECURITY DEFINER (owner postgres), por isso continuam a funcionar.
DO $do$
BEGIN
  REVOKE EXECUTE ON FUNCTION net.http_post(text, jsonb, jsonb, jsonb, integer) FROM PUBLIC, anon, authenticated;
  REVOKE EXECUTE ON FUNCTION net.http_get(text, jsonb, jsonb, integer) FROM PUBLIC, anon, authenticated;
  REVOKE EXECUTE ON FUNCTION net.http_delete(text, jsonb, jsonb, integer, jsonb) FROM PUBLIC, anon, authenticated;
  REVOKE EXECUTE ON FUNCTION net.http_collect_response(bigint, boolean) FROM PUBLIC, anon, authenticated;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'net revoke skipped: %', SQLERRM;
END
$do$;