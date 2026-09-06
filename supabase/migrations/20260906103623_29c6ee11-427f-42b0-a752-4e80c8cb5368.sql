CREATE OR REPLACE FUNCTION public.generate_lead_form_token(p_lead_id uuid)
RETURNS TABLE (token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_expires timestamptz;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Sem permissão para gerar o formulário de candidatura';
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_expires := now() + interval '14 days';

  UPDATE public.leads
     SET public_token = v_token,
         public_token_expires_at = v_expires,
         updated_at = now()
   WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidatura não encontrada';
  END IF;

  RETURN QUERY SELECT v_token, v_expires;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_lead_form_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_lead_form_token(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_lead_form_data(p_token text)
RETURNS TABLE (
  full_name text,
  email text,
  phone text,
  address text,
  nationality text,
  form_submitted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT l.full_name, l.email, l.phone, l.address, l.nationality, l.form_submitted_at
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
    document_number = COALESCE(NULLIF(p_data->>'document_number',''), document_number),
    document_validity = COALESCE((NULLIF(p_data->>'document_validity',''))::date, document_validity),
    tax_number = COALESCE(NULLIF(p_data->>'tax_number',''), tax_number),
    course = COALESCE(NULLIF(p_data->>'course',''), course),
    course_duration = COALESCE(NULLIF(p_data->>'course_duration',''), course_duration),
    employer_or_school = COALESCE(NULLIF(p_data->>'employer_or_school',''), employer_or_school),
    job_title = COALESCE(NULLIF(p_data->>'job_title',''), job_title),
    emergency_contact_name = COALESCE(NULLIF(p_data->>'emergency_contact_name',''), emergency_contact_name),
    emergency_contact_relation = COALESCE(NULLIF(p_data->>'emergency_contact_relation',''), emergency_contact_relation),
    emergency_contact_phone = COALESCE(NULLIF(p_data->>'emergency_contact_phone',''), emergency_contact_phone),
    emergency_contact_email = COALESCE(NULLIF(p_data->>'emergency_contact_email',''), emergency_contact_email),
    candidate_comments = COALESCE(NULLIF(p_data->>'candidate_comments',''), candidate_comments),
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