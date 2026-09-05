-- 1/2. Novos campos em leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.rooms(id),
  ADD COLUMN IF NOT EXISTS contract_generated_at timestamptz;

-- 3. Estadia ligada a uma lead
ALTER TABLE public.stays
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id);

CREATE INDEX IF NOT EXISTS stays_lead_id_idx ON public.stays(lead_id);

-- 4. Novo estado 'reserved' antes de 'won'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lead_status' AND e.enumlabel = 'reserved'
  ) THEN
    ALTER TYPE public.lead_status ADD VALUE 'reserved' BEFORE 'won';
  END IF;
END $$;

-- Reserva só-lead: não criar residente nem tarefas de preparação
CREATE OR REPLACE FUNCTION public.stay_prepare_checkin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_resident_id UUID;
  v_resident_status resident_status;
  v_room_status room_status;
  v_room_number TEXT;
BEGIN
  IF NEW.status NOT IN ('confirmed','checked_in') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Reserva de lead (sem residente nem contrato): só marca o quarto como reservado
  IF NEW.resident_id IS NULL AND NEW.contract_id IS NULL AND NEW.lead_id IS NOT NULL THEN
    IF NEW.room_id IS NOT NULL THEN
      UPDATE public.rooms
      SET status = 'reserved'::room_status, updated_at = now()
      WHERE id = NEW.room_id AND status IN ('available','cleaning_required');
    END IF;
    RETURN NEW;
  END IF;

  v_resident_status := CASE WHEN NEW.status = 'checked_in' THEN 'active'::resident_status ELSE 'upcoming'::resident_status END;
  v_room_status := CASE WHEN NEW.status = 'checked_in' THEN 'occupied'::room_status ELSE 'reserved'::room_status END;

  -- 1) Upsert residente
  IF NEW.resident_id IS NULL THEN
    SELECT id INTO v_resident_id FROM public.residents WHERE email = NEW.email LIMIT 1;
    IF v_resident_id IS NULL THEN
      INSERT INTO public.residents (full_name, email, phone, room_id, move_in, move_out, status, avatar_color)
      VALUES (NEW.full_name, NEW.email, NEW.phone, NEW.room_id, NEW.check_in, NEW.check_out, v_resident_status,
              '#' || lpad(to_hex((random()*16777215)::int),6,'0'))
      RETURNING id INTO v_resident_id;
    ELSE
      UPDATE public.residents
      SET full_name = NEW.full_name, phone = COALESCE(NEW.phone, phone),
          room_id = NEW.room_id, move_in = NEW.check_in, move_out = NEW.check_out,
          status = v_resident_status
      WHERE id = v_resident_id;
    END IF;
    NEW.resident_id := v_resident_id;
  ELSE
    UPDATE public.residents
    SET full_name = NEW.full_name, phone = COALESCE(NEW.phone, phone),
        room_id = NEW.room_id, move_in = NEW.check_in, move_out = NEW.check_out,
        status = v_resident_status
    WHERE id = NEW.resident_id;
    v_resident_id := NEW.resident_id;
  END IF;

  -- 2) Estado do quarto
  IF NEW.room_id IS NOT NULL THEN
    UPDATE public.rooms
    SET status = v_room_status,
        current_resident_id = v_resident_id
    WHERE id = NEW.room_id;
    SELECT number INTO v_room_number FROM public.rooms WHERE id = NEW.room_id;
  END IF;

  -- 2b) Ativar contrato ligado no check-in
  IF NEW.status = 'checked_in' AND NEW.contract_id IS NOT NULL THEN
    UPDATE public.contracts
    SET status = 'active'
    WHERE id = NEW.contract_id AND status = 'reserved';
  END IF;

  -- 3) Tarefas de preparação (apenas na transição para confirmed)
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed')
     OR (TG_OP = 'UPDATE' AND OLD.status NOT IN ('confirmed','checked_in') AND NEW.status = 'confirmed') THEN

    INSERT INTO public.cleaning_tasks (type, service, source, source_ref, room_id, area, scheduled_for, status, notes)
    VALUES ('room_regular','normal','manual', NEW.id::TEXT, NEW.room_id,
            'Quarto ' || COALESCE(v_room_number,'?') || ' — Preparação entrada',
            NEW.check_in - interval '1 day', 'scheduled',
            'Limpeza de preparação para entrada de ' || NEW.full_name);

    INSERT INTO public.ops_tasks (title, description, category, priority, resident_id, room_id, due_date, source_ref)
    VALUES ('Kit de boas-vindas — ' || NEW.full_name,
            'Preparar kit (chaves, manual, brindes) para entrada no quarto ' || COALESCE(v_room_number,'?'),
            'logistics','medium', v_resident_id, NEW.room_id, NEW.check_in, NEW.id::TEXT);

    IF NEW.room_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.cleaning_schedules
      WHERE room_id = NEW.room_id AND type = 'room_regular' AND active
    ) THEN
      INSERT INTO public.cleaning_schedules
        (name, type, service, area, room_id, recurrence, day_of_week, hour, minute, active)
      VALUES ('Limpeza quinzenal — Quarto ' || COALESCE(v_room_number,'?'),
              'room_regular','normal',
              'Quarto ' || COALESCE(v_room_number,'?'),
              NEW.room_id,'biweekly',1,10,0,true);
    END IF;
  END IF;

  RETURN NEW;
END
$function$;

-- 5a) Reservar quarto para uma lead
CREATE OR REPLACE FUNCTION public.reserve_room_for_lead(
  p_lead_id uuid,
  p_room_id uuid,
  p_check_in timestamptz,
  p_check_out timestamptz
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead public.leads;
  v_room_number text;
  v_stay_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'staff')) THEN
    RAISE EXCEPTION 'Sem permissão para reservar quartos';
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead não encontrada';
  END IF;

  SELECT number INTO v_room_number FROM public.rooms WHERE id = p_room_id;
  IF v_room_number IS NULL THEN
    RAISE EXCEPTION 'Quarto não encontrado';
  END IF;

  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'A data de saída tem de ser posterior à data de entrada';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.stays s
    WHERE s.lead_id = p_lead_id AND s.status IN ('confirmed','checked_in')
  ) THEN
    RAISE EXCEPTION 'Esta lead já tem uma reserva ativa. Cancela-a antes de criar outra.';
  END IF;

  BEGIN
    INSERT INTO public.stays (lead_id, resident_id, contract_id, full_name, email, phone,
                              room_id, check_in, check_out, status, source, notes)
    VALUES (p_lead_id, NULL, NULL, v_lead.full_name, v_lead.email, v_lead.phone,
            p_room_id, p_check_in, p_check_out, 'confirmed', 'manual',
            'Reserva a partir da lead')
    RETURNING id INTO v_stay_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'O quarto % já está reservado ou ocupado neste período.', v_room_number
      USING ERRCODE = 'exclusion_violation';
  END;

  UPDATE public.leads
  SET status = 'reserved', room_id = p_room_id, updated_at = now()
  WHERE id = p_lead_id;

  RETURN v_stay_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_room_for_lead(uuid, uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_room_for_lead(uuid, uuid, timestamptz, timestamptz) TO authenticated, service_role;

-- 5b) Cancelar reserva
CREATE OR REPLACE FUNCTION public.cancel_room_reservation(p_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  RETURN v_stay.id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_room_reservation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_room_reservation(uuid) TO authenticated, service_role;

-- 5c) Promover reserva a contrato (reaproveita a estadia existente)
CREATE OR REPLACE FUNCTION public.promote_reservation_to_contract(
  p_lead_id uuid,
  p_contract_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      document_number, document_validity, tax_number, date_of_birth, employer_or_school
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
      NULLIF(p_contract_data->>'postal_code',''),
      NULLIF(p_contract_data->>'city',''),
      COALESCE(NULLIF(p_contract_data->>'document_number',''), v_lead.document_number),
      COALESCE(NULLIF(p_contract_data->>'document_validity','')::date, v_lead.document_validity),
      COALESCE(NULLIF(p_contract_data->>'tax_number',''), v_lead.tax_number),
      NULLIF(p_contract_data->>'date_of_birth','')::date,
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
        postal_code = COALESCE(NULLIF(p_contract_data->>'postal_code',''), postal_code),
        city = COALESCE(NULLIF(p_contract_data->>'city',''), city),
        document_number = COALESCE(NULLIF(p_contract_data->>'document_number',''), document_number, v_lead.document_number),
        document_validity = COALESCE(NULLIF(p_contract_data->>'document_validity','')::date, document_validity, v_lead.document_validity),
        tax_number = COALESCE(NULLIF(p_contract_data->>'tax_number',''), tax_number, v_lead.tax_number),
        date_of_birth = COALESCE(NULLIF(p_contract_data->>'date_of_birth','')::date, date_of_birth),
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
    INSERT INTO public.cleaning_tasks (type, service, source, source_ref, room_id, area, scheduled_for, status, notes)
    VALUES ('room_regular','normal','manual', v_stay.id::text, v_stay.room_id,
            'Quarto ' || COALESCE(v_room_number,'?') || ' — Preparação entrada',
            v_stay.check_in - interval '1 day', 'scheduled',
            'Limpeza de preparação para entrada de ' || v_stay.full_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ops_tasks WHERE source_ref = v_stay.id::text
  ) THEN
    INSERT INTO public.ops_tasks (title, description, category, priority, resident_id, room_id, due_date, source_ref)
    VALUES ('Kit de boas-vindas — ' || v_stay.full_name,
            'Preparar kit (chaves, manual, brindes) para entrada no quarto ' || COALESCE(v_room_number,'?'),
            'logistics','medium', v_resident_id, v_stay.room_id, v_stay.check_in, v_stay.id::text);
  END IF;

  -- 7) Lead ganha
  UPDATE public.leads
  SET status = 'won', contract_id = v_contract_id, updated_at = now()
  WHERE id = p_lead_id;

  RETURN jsonb_build_object('stay_id', v_stay.id, 'resident_id', v_resident_id, 'contract_id', v_contract_id);
END;
$$;

REVOKE ALL ON FUNCTION public.promote_reservation_to_contract(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_reservation_to_contract(uuid, jsonb) TO authenticated, service_role;