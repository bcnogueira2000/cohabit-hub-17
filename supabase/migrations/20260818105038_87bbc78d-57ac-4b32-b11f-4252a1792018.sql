CREATE OR REPLACE FUNCTION public.stay_prepare_checkin()
 RETURNS trigger
 LANGUAGE plpgsql
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

    INSERT INTO public.ops_tasks (title, description, category, priority, resident_id, room_id, due_date)
    VALUES ('Kit de boas-vindas — ' || NEW.full_name,
            'Preparar kit (chaves, manual, brindes) para entrada no quarto ' || COALESCE(v_room_number,'?'),
            'logistics','medium', v_resident_id, NEW.room_id, NEW.check_in);

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
END $function$;

CREATE OR REPLACE FUNCTION public.stay_handle_checkout()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'checked_out' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'checked_out') THEN
    IF NEW.resident_id IS NOT NULL THEN
      UPDATE public.residents SET status = 'checking_out', move_out = COALESCE(NEW.check_out, now())
      WHERE id = NEW.resident_id;
    END IF;
    IF NEW.room_id IS NOT NULL THEN
      UPDATE public.rooms
      SET status = 'cleaning_required',
          current_resident_id = NULL
      WHERE id = NEW.room_id;
    END IF;
    IF NEW.contract_id IS NOT NULL THEN
      UPDATE public.contracts
      SET status = 'terminated',
          actual_end_date = NEW.check_out::date
      WHERE id = NEW.contract_id;
    END IF;
  END IF;
  RETURN NEW;
END $function$;