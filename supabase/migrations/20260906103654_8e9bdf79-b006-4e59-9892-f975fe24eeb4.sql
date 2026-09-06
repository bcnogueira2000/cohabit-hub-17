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
  IF coalesce(auth.role(), '') <> 'service_role'
     AND NOT (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')) THEN
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