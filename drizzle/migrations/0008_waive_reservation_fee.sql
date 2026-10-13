CREATE OR REPLACE FUNCTION public.waive_reservation_fee(p_contract_id uuid, p_lead_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_received numeric := 0; v_name text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) THEN
    RAISE EXCEPTION 'Sem permissão para dispensar taxas';
  END IF;
  IF coalesce(trim(p_reason),'') = '' THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;
  SELECT full_name INTO v_name FROM public.profiles WHERE user_id = auth.uid();
  SELECT coalesce(sum(amount),0) INTO v_received FROM public.payments
   WHERE kind='booking_fee' AND status='active'
     AND ((p_contract_id IS NOT NULL AND contract_id=p_contract_id) OR (p_lead_id IS NOT NULL AND lead_id=p_lead_id));
  IF p_contract_id IS NOT NULL THEN
    UPDATE public.contracts SET reservation_fee_amount = v_received WHERE id = p_contract_id;
    INSERT INTO public.contract_activity(contract_id, actor_user_id, actor_name, kind, payload)
    VALUES (p_contract_id, auth.uid(), v_name, 'reservation_fee_waived', jsonb_build_object('reason', p_reason, 'kept_amount', v_received));
  END IF;
  IF p_lead_id IS NOT NULL THEN
    UPDATE public.leads SET reservation_fee_amount = v_received WHERE id = p_lead_id;
    INSERT INTO public.lead_activity(lead_id, actor_user_id, actor_name, kind, payload)
    VALUES (p_lead_id, auth.uid(), v_name, 'reservation_fee_waived', jsonb_build_object('reason', p_reason, 'kept_amount', v_received));
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.waive_reservation_fee(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.waive_reservation_fee(uuid,uuid,text) TO authenticated, service_role;
ALTER TABLE public.contracts ALTER COLUMN reservation_fee_amount SET DEFAULT 0;