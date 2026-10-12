CREATE OR REPLACE FUNCTION public.stay_handle_checkout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'checked_out' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'checked_out') THEN
    IF NEW.resident_id IS NOT NULL THEN
      UPDATE public.residents SET status = 'past', move_out = COALESCE(NEW.check_out, now())
      WHERE id = NEW.resident_id;
    END IF;
    IF NEW.room_id IS NOT NULL THEN
      UPDATE public.rooms SET status = 'cleaning_required', current_resident_id = NULL WHERE id = NEW.room_id;
    END IF;
    IF NEW.contract_id IS NOT NULL THEN
      UPDATE public.contracts SET status = 'terminated', actual_end_date = NEW.check_out::date WHERE id = NEW.contract_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Tarefas de saída (inspeção + devolução de caução) também quando passa diretamente a ex-residente.
CREATE OR REPLACE FUNCTION public.auto_create_checkout_tasks()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_room_number TEXT;
BEGIN
  IF NEW.status IN ('checking_out','past')
     AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('checking_out','past')) THEN
    SELECT number INTO v_room_number FROM public.rooms WHERE id = NEW.room_id;
    INSERT INTO public.cleaning_tasks (type, service, source, source_ref, room_id, area, scheduled_for, status)
    VALUES ('checkout_inspection','normal','checkout', NEW.id::TEXT, NEW.room_id,
            'Quarto ' || COALESCE(v_room_number,'?') || ' — Inspeção saída',
            COALESCE(NEW.move_out, now() + interval '2 days'), 'scheduled');
    INSERT INTO public.ops_tasks (title, description, category, priority, resident_id, room_id, due_date)
    VALUES ('Devolução de caução — ' || NEW.full_name,
            'Verificar inspeção e processar devolução da caução.',
            'admin','medium', NEW.id, NEW.room_id,
            COALESCE(NEW.move_out, now() + interval '3 days') + interval '2 days');
  END IF;
  RETURN NEW;
END $$;

-- Havia dois gatilhos iguais (tarefas de saída em duplicado).
DROP TRIGGER IF EXISTS trg_resident_checkout ON public.residents;