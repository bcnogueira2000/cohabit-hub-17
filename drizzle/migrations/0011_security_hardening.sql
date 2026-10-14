ALTER VIEW public.rent_charge_balance SET (security_invoker = true);

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
GRANT INSERT ON public.requests, public.stays TO anon;
GRANT USAGE ON SEQUENCE public.requests_code_seq TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;

DROP POLICY IF EXISTS "staff manage roles" ON public.user_roles;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon;

DROP POLICY IF EXISTS "resident update own resident" ON public.residents;

CREATE OR REPLACE FUNCTION public.approve_profile(p_user_id uuid, p_resident_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existing uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para aprovar contas'; END IF;
  SELECT user_id INTO v_existing FROM public.residents WHERE id = p_resident_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Residente não encontrado'; END IF;
  IF v_existing IS NOT NULL AND v_existing <> p_user_id THEN
    RAISE EXCEPTION 'Este residente já está ligado a outra conta';
  END IF;
  UPDATE public.residents SET user_id = p_user_id WHERE id = p_resident_id;
  UPDATE public.profiles SET account_status = 'active', resident_id = p_resident_id WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, 'resident') ON CONFLICT DO NOTHING;
END $$;
REVOKE EXECUTE ON FUNCTION public.approve_profile(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_profile(uuid, uuid) TO authenticated;