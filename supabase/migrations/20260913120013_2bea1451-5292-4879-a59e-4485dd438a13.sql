-- 1) Índice único do NIF exclui o valor de recurso 999999990
DROP INDEX IF EXISTS public.residents_tax_number_unique;
CREATE UNIQUE INDEX residents_tax_number_unique
  ON public.residents (tax_number)
  WHERE tax_number IS NOT NULL AND tax_number <> '' AND tax_number <> '999999990';

-- 2) Fallback dos dados da lead para postal_code, city e date_of_birth
CREATE OR REPLACE FUNCTION public.promote_reservation_to_contract(p_lead_id uuid, p_contract_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_stay public.stays;
  v_lead public.leads;
  v_resident_id uuid;
  v_contract_id uuid;
  v_start date;
  v_end date;
  v_monthly numeric;
  v_regular numeric;
  v_payment_day int;
  v_deposit numeric;
  v_notes text;
  v_room_number text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) THEN
    RAISE EXCEPTION 'Sem permissão para criar contratos';
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead não encontrada';
  END IF;

  SELECT * INTO v_stay
  FROM public.stays
  WHERE lead_id = p_lead_id AND status IN ('confirmed','checked_in')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_stay.id IS NULL THEN
    RAISE EXCEPTION 'Esta lead não tem reserva ativa para promover a contrato';
  END IF;

  v_start := COALESCE((p_contract_data->>'start_date')::date, v_stay.check_in::date);
  v_end := COALESCE((p_contract_data->>'end_date')::date, v_stay.check_out::date);
  v_monthly := (p_contract_data->>'monthly_amount')::numeric;
  v_regular := NULLIF(p_contract_data->>'regular_rent_amount','')::numeric;
  v_payment_day := COALESCE((p_contract_data->>'payment_day')::int, 5);
  v_deposit := COALESCE((p_contract_data->>'deposit_due')::numeric, 0);
  v_notes := NULLIF(p_contract_data->>'notes','');

  IF v_monthly IS NULL OR v_monthly <= 0 THEN
    RAISE EXCEPTION 'Indica a renda mensal';
  END IF;

  -- 1) Residente (reaproveita o da estadia ou o existente com o mesmo email)
  v_resident_id := v_stay.resident_id;
  IF v_resident_id IS NULL THEN
    SELECT id INTO v_resident_id FROM public.residents WHERE email = v_stay.email LIMIT 1;
  END IF;

  IF v_resident_id IS NULL THEN
    INSERT INTO public.residents (
      full_name, email, phone, room_id, move_in, move_out, status, avatar_color,
      nationality, profile, age, gender, address, postal_code, city,
      document_type, document_number, document_validity, tax_number, date_of_birth, employer_or_school
    ) VALUES (
      COALESCE(p_contract_data->>'full_name', v_stay.full_name),
      COALESCE(p_contract_data->>'email', v_stay.email),
      COALESCE(p_contract_data->>'phone', v_stay.phone),
      v_stay.room_id, v_stay.check_in, v_stay.check_out, 'upcoming',
      '#' || lpad(to_hex((random()*16777215)::int),6,'0'),
      COALESCE(NULLIF(p_contract_data->>'nationality',''), v_lead.nationality),
      COALESCE(NULLIF(p_contract_data->>'profile',''), v_lead.profile),
      COALESCE(NULLIF(p_contract_data->>'age',''), v_lead.age),
      COALESCE(NULLIF(p_contract_data->>'gender',''), v_lead.gender),
      COALESCE(NULLIF(p_contract_data->>'address',''), v_lead.address),
      COALESCE(NULLIF(p_contract_data->>'postal_code',''), v_lead.postal_code),
      COALESCE(NULLIF(p_contract_data->>'city',''), v_lead.city),
      COALESCE(NULLIF(p_contract_data->>'document_type',''), v_lead.document_type),
      COALESCE(NULLIF(p_contract_data->>'document_number',''), v_lead.document_number),
      COALESCE(NULLIF(p_contract_data->>'document_validity','')::date, v_lead.document_validity),
      COALESCE(NULLIF(p_contract_data->>'tax_number',''), v_lead.tax_number),
      COALESCE(NULLIF(p_contract_data->>'date_of_birth','')::date, v_lead.date_of_birth),
      NULLIF(p_contract_data->>'employer_or_school','')
    ) RETURNING id INTO v_resident_id;
  ELSE
    UPDATE public.residents
    SET full_name = COALESCE(NULLIF(p_contract_data->>'full_name',''), full_name),
        phone = COALESCE(NULLIF(p_contract_data->>'phone',''), phone),
        room_id = v_stay.room_id,
        move_in = v_stay.check_in,
        move_out = v_stay.check_out,
        status = CASE WHEN status = 'past' THEN 'upcoming'::resident_status ELSE status END,
        nationality = COALESCE(NULLIF(p_contract_data->>'nationality',''), nationality, v_lead.nationality),
        profile = COALESCE(NULLIF(p_contract_data->>'profile',''), profile, v_lead.profile),
        address = COALESCE(NULLIF(p_contract_data->>'address',''), address, v_lead.address),
        postal_code = COALESCE(NULLIF(p_contract_data->>'postal_code',''), postal_code, v_lead.postal_code),
        city = COALESCE(NULLIF(p_contract_data->>'city',''), city, v_lead.city),
        document_type = COALESCE(NULLIF(p_contract_data->>'document_type',''), document_type, v_lead.document_type),
        document_number = COALESCE(NULLIF(p_contract_data->>'document_number',''), document_number, v_lead.document_number),
        document_validity = COALESCE(NULLIF(p_contract_data->>'document_validity','')::date, document_validity, v_lead.document_validity),
        tax_number = COALESCE(NULLIF(p_contract_data->>'tax_number',''), tax_number, v_lead.tax_number),
        date_of_birth = COALESCE(NULLIF(p_contract_data->>'date_of_birth','')::date, date_of_birth, v_lead.date_of_birth),
        employer_or_school = COALESCE(NULLIF(p_contract_data->>'employer_or_school',''), employer_or_school),
        updated_at = now()
    WHERE id = v_resident_id;
  END IF;

  -- 2) Contrato
  INSERT INTO public.contracts (
    resident_id, lead_id, start_date, end_date, status, payment_day,
    deposit_due, regular_rent_amount, notes
  ) VALUES (
    v_resident_id, p_lead_id, v_start, v_end, 'reserved', v_payment_day,
    v_deposit, v_regular, v_notes
  ) RETURNING id INTO v_contract_id;

  -- 3) Atualiza a estadia existente (não cria nova)
  UPDATE public.stays
  SET resident_id = v_resident_id,
      contract_id = v_contract_id,
      full_name = COALESCE(NULLIF(p_contract_data->>'full_name',''), full_name),
      email = COALESCE(NULLIF(p_contract_data->>'email',''), email),
      phone = COALESCE(NULLIF(p_contract_data->>'phone',''), phone),
      updated_at = now()
  WHERE id = v_stay.id;

  -- 4) Quarto passa a ter residente associado
  IF v_stay.room_id IS NOT NULL THEN
    SELECT number INTO v_room_number FROM public.rooms WHERE id = v_stay.room_id;
    UPDATE public.rooms
    SET current_resident_id = v_resident_id,
        status = CASE WHEN v_stay.status = 'checked_in' THEN 'occupied'::room_status ELSE 'reserved'::room_status END,
        updated_at = now()
    WHERE id = v_stay.room_id;
  END IF;

  -- 5) Primeiro período de renda + mensalidades
  INSERT INTO public.contract_rent_periods (contract_id, valid_from, monthly_amount)
  VALUES (v_contract_id, v_start, v_monthly);

  PERFORM public.generate_rent_charges(v_contract_id);

  -- 6) Tarefas de preparação de entrada
  IF NOT EXISTS (
    SELECT 1 FROM public.cleaning_tasks WHERE source_ref = v_stay.id::text
  ) THEN
    INSERT INTO public.cleaning_tasks (
      type, service, source, source_ref, room_id, area, scheduled_for, status,
      location_id, assigned_to, notes
    )
    SELECT 'checkout_inspection', 'normal', 'checkout', v_stay.id::text,
           r.id, 'Quarto ' || COALESCE(r.number, ''), v_stay.check_in, 'scheduled',
           r.location_id, NULL, 'Preparação de entrada (promoção de reserva)'
    FROM public.rooms r
    WHERE r.id = v_stay.room_id;
  END IF;

  -- 7) Atualiza lead
  UPDATE public.leads
  SET status = 'won',
      contract_id = v_contract_id,
      updated_at = now()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'resident_id', v_resident_id,
    'contract_id', v_contract_id,
    'stay_id', v_stay.id,
    'room_number', v_room_number
  );
END;
$function$;