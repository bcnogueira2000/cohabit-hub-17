ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS reservation_agreement_generated_at timestamptz;

CREATE OR REPLACE FUNCTION public.sign_lead_contract(p_lead_id uuid, p_contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lead public.leads;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) THEN
    RAISE EXCEPTION 'Sem permissão para criar contratos';
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'Lead não encontrada'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stays WHERE lead_id = p_lead_id AND status IN ('confirmed','checked_in')
  ) THEN
    IF v_lead.room_id IS NULL OR v_lead.planned_check_in IS NULL OR v_lead.planned_check_out IS NULL THEN
      RAISE EXCEPTION 'Falta o quarto ou as datas previstas nesta lead';
    END IF;
    PERFORM public.reserve_room_for_lead(
      p_lead_id, v_lead.room_id,
      v_lead.planned_check_in::timestamptz, v_lead.planned_check_out::timestamptz);
  END IF;

  RETURN public.promote_reservation_to_contract(p_lead_id, p_contract_data);
END;
$function$;

REVOKE ALL ON FUNCTION public.sign_lead_contract(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sign_lead_contract(uuid, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.give_up_lead(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'staff')) THEN
    RAISE EXCEPTION 'Sem permissão para alterar leads';
  END IF;

  IF EXISTS (SELECT 1 FROM public.stays WHERE lead_id = p_lead_id AND status = 'confirmed') THEN
    PERFORM public.cancel_room_reservation(p_lead_id);
  END IF;

  UPDATE public.leads
     SET status = 'lost',
         reservation_agreement_generated_at = NULL,
         contract_generated_at = NULL,
         reservation_not_applicable = false,
         reservation_waiver_reason = NULL,
         reservation_waiver_by = NULL,
         reservation_waiver_at = NULL,
         updated_at = now()
   WHERE id = p_lead_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.give_up_lead(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.give_up_lead(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancel_room_reservation(p_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_stay public.stays;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'staff')) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar reservas';
  END IF;

  SELECT * INTO v_stay
  FROM public.stays
  WHERE lead_id = p_lead_id AND status = 'confirmed'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_stay.id IS NULL THEN
    RAISE EXCEPTION 'Não existe reserva ativa para esta lead';
  END IF;

  UPDATE public.stays SET status = 'cancelled', updated_at = now() WHERE id = v_stay.id;

  IF v_stay.room_id IS NOT NULL THEN
    UPDATE public.rooms
    SET current_resident_id = CASE
          WHEN current_resident_id IS NOT NULL AND current_resident_id = v_stay.resident_id THEN NULL
          ELSE current_resident_id END,
        status = CASE WHEN status = 'reserved' THEN 'available'::room_status ELSE status END,
        updated_at = now()
    WHERE id = v_stay.room_id;
  END IF;

  UPDATE public.leads
     SET reservation_not_applicable = false,
         reservation_waiver_reason = NULL,
         reservation_waiver_by = NULL,
         reservation_waiver_at = NULL,
         reservation_agreement_generated_at = NULL,
         updated_at = now()
   WHERE id = p_lead_id;

  RETURN v_stay.id;
END;
$function$;