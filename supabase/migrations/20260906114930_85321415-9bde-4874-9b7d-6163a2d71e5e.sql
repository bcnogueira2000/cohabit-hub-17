DROP FUNCTION IF EXISTS public.get_lead_form_data(text);

CREATE FUNCTION public.get_lead_form_data(p_token text)
RETURNS TABLE (
  full_name text,
  email text,
  phone text,
  nationality text,
  date_of_birth date,
  document_type text,
  document_number text,
  document_validity date,
  tax_number text,
  address text,
  postal_code text,
  city text,
  profile text,
  employer_or_school text,
  course text,
  course_duration text,
  job_title text,
  emergency_contact_name text,
  emergency_contact_relation text,
  emergency_contact_phone text,
  emergency_contact_email text,
  candidate_comments text,
  gdpr_consent boolean,
  language text,
  form_submitted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT l.full_name, l.email, l.phone, l.nationality, l.date_of_birth,
         l.document_type, l.document_number, l.document_validity, l.tax_number,
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
$$;

REVOKE ALL ON FUNCTION public.get_lead_form_data(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lead_form_data(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_lead_form(p_token text, p_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  SELECT id INTO v_lead_id
    FROM public.leads
   WHERE public_token = p_token
     AND public_token_expires_at > now();

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Este link expirou ou é inválido';
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
    document_number = COALESCE(NULLIF(p_data->>'document_number',''), document_number),
    document_validity = COALESCE((NULLIF(p_data->>'document_validity',''))::date, document_validity),
    tax_number = COALESCE(NULLIF(p_data->>'tax_number',''), tax_number),
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
    form_submitted_at = now(),
    updated_at = now()
  WHERE id = v_lead_id;

  INSERT INTO public.lead_activity (lead_id, actor_name, kind, payload)
  VALUES (v_lead_id, 'Candidato', 'form_submitted', jsonb_build_object('fields', p_data));

  RETURN v_lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_lead_form(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_lead_form(text, jsonb) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.lead_id_for_form_token(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  SELECT id INTO v_lead_id
    FROM public.leads
   WHERE public_token = p_token
     AND public_token_expires_at > now();

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Este link expirou ou é inválido';
  END IF;

  RETURN v_lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.lead_id_for_form_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lead_id_for_form_token(text) TO service_role;

CREATE OR REPLACE FUNCTION public.register_lead_document(
  p_token text,
  p_file_name text,
  p_storage_path text,
  p_file_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_doc_id uuid;
BEGIN
  v_lead_id := public.lead_id_for_form_token(p_token);

  INSERT INTO public.lead_documents (lead_id, file_name, storage_path, file_type)
  VALUES (v_lead_id, p_file_name, p_storage_path, p_file_type)
  RETURNING id INTO v_doc_id;

  RETURN v_doc_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_lead_document(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_lead_document(text, text, text, text) TO service_role;