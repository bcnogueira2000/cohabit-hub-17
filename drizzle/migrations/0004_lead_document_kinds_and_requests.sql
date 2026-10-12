ALTER TABLE public.lead_documents ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE public.lead_documents ADD CONSTRAINT lead_documents_kind_check
  CHECK (kind IS NULL OR kind IN ('id_document','iban_proof','enrollment_or_work_proof','other'));

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS docs_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS docs_request_message text,
  ADD COLUMN IF NOT EXISTS docs_request_items text[],
  ADD COLUMN IF NOT EXISTS docs_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS docs_validated_at timestamptz;

DROP FUNCTION IF EXISTS public.register_lead_document(text, text, text, text);
CREATE FUNCTION public.register_lead_document(
  p_token text, p_file_name text, p_storage_path text, p_file_type text, p_kind text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead_id uuid; v_doc_id uuid;
BEGIN
  v_lead_id := public.lead_id_for_form_token(p_token);
  IF p_kind IS NOT NULL AND p_kind NOT IN ('id_document','iban_proof','enrollment_or_work_proof','other') THEN
    RAISE EXCEPTION 'Tipo de documento inválido';
  END IF;
  INSERT INTO public.lead_documents (lead_id, file_name, storage_path, file_type, kind)
  VALUES (v_lead_id, p_file_name, p_storage_path, p_file_type, p_kind)
  RETURNING id INTO v_doc_id;
  RETURN v_doc_id;
END $$;
REVOKE ALL ON FUNCTION public.register_lead_document(text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_lead_document(text,text,text,text,text) TO service_role;

-- Dados mínimos para a página pública de substituição de documentos (sem dados pessoais).
CREATE OR REPLACE FUNCTION public.get_lead_docs_request(p_token text)
RETURNS TABLE (first_name text, language text, profile text, message text, items text[],
               requested_at timestamptz, received_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT split_part(coalesce(nullif(l.short_name,''), l.full_name, ''), ' ', 1),
         l.language, l.profile, l.docs_request_message, l.docs_request_items,
         l.docs_requested_at, l.docs_received_at
    FROM public.leads l
   WHERE l.public_token = p_token AND l.public_token_expires_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Este link expirou ou é inválido'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.get_lead_docs_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lead_docs_request(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_lead_documents(p_token text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  UPDATE public.leads SET docs_received_at = v_now, updated_at = v_now WHERE id = v_lead.id;

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
END $$;
REVOKE ALL ON FUNCTION public.submit_lead_documents(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_lead_documents(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.validate_lead_documents(p_lead_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_now timestamptz := now(); v_name text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.leads SET docs_validated_at = v_now, updated_at = v_now WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead não encontrada'; END IF;
  SELECT full_name INTO v_name FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.lead_activity (lead_id, actor_user_id, actor_name, kind, payload)
  VALUES (p_lead_id, auth.uid(), v_name, 'docs_validated', '{}'::jsonb);
  RETURN v_now;
END $$;
REVOKE ALL ON FUNCTION public.validate_lead_documents(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_lead_documents(uuid) TO authenticated, service_role;