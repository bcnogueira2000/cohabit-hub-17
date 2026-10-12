ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS reservation_not_applicable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reservation_waiver_reason text,
  ADD COLUMN IF NOT EXISTS reservation_waiver_by uuid,
  ADD COLUMN IF NOT EXISTS reservation_waiver_at timestamptz;

CREATE OR REPLACE FUNCTION public.reserve_room_without_fee(p_lead_id uuid, p_reason text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lead public.leads;
  v_stay_id uuid;
  v_actor uuid := auth.uid();
  v_actor_name text;
  v_room_number text;
BEGIN
  IF NOT (public.has_role(v_actor,'admin') OR public.has_role(v_actor,'manager') OR public.has_role(v_actor,'staff')) THEN
    RAISE EXCEPTION 'Sem permissão para reservar quartos';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Indica o motivo da dispensa do acordo de reserva';
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'Lead não encontrada'; END IF;
  IF v_lead.room_id IS NULL OR v_lead.planned_check_in IS NULL OR v_lead.planned_check_out IS NULL THEN
    RAISE EXCEPTION 'Falta o quarto ou as datas previstas nesta lead';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payments WHERE lead_id = p_lead_id AND kind = 'booking_fee') THEN
    RAISE EXCEPTION 'Esta lead já tem uma taxa de reserva paga';
  END IF;

  v_stay_id := public.reserve_room_for_lead(
    p_lead_id, v_lead.room_id,
    v_lead.planned_check_in::timestamptz, v_lead.planned_check_out::timestamptz);

  UPDATE public.leads
     SET reservation_not_applicable = true,
         reservation_waiver_reason = trim(p_reason),
         reservation_waiver_by = v_actor,
         reservation_waiver_at = now(),
         updated_at = now()
   WHERE id = p_lead_id;

  SELECT full_name INTO v_actor_name FROM public.profiles WHERE user_id = v_actor;
  SELECT number INTO v_room_number FROM public.rooms WHERE id = v_lead.room_id;

  INSERT INTO public.lead_activity (lead_id, actor_user_id, actor_name, kind, payload)
  VALUES (p_lead_id, v_actor, v_actor_name, 'reservation_waived',
          jsonb_build_object('reason', trim(p_reason), 'room_id', v_lead.room_id, 'room_number', v_room_number,
                             'check_in', v_lead.planned_check_in, 'check_out', v_lead.planned_check_out,
                             'waived_at', now(), 'stay_id', v_stay_id));

  RETURN v_stay_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_room_without_fee(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_room_without_fee(uuid, text) TO authenticated, service_role;

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
         updated_at = now()
   WHERE id = p_lead_id;

  RETURN v_stay.id;
END;
$function$;