CREATE OR REPLACE FUNCTION public.sync_resident_from_stay()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.resident_id IS NOT NULL THEN
    UPDATE public.residents
    SET room_id = NEW.room_id,
        move_in = NEW.check_in,
        move_out = NEW.check_out,
        updated_at = now()
    WHERE id = NEW.resident_id;
  END IF;

  -- quarto mudou: libertar o antigo e ocupar o novo
  IF COALESCE(OLD.room_id::text,'') IS DISTINCT FROM COALESCE(NEW.room_id::text,'') THEN
    IF OLD.room_id IS NOT NULL THEN
      UPDATE public.rooms
      SET current_resident_id = NULL,
          status = CASE WHEN status IN ('occupied','reserved') THEN 'cleaning_required'::room_status ELSE status END,
          updated_at = now()
      WHERE id = OLD.room_id
        AND (current_resident_id IS NULL OR current_resident_id = NEW.resident_id);
    END IF;

    IF NEW.room_id IS NOT NULL AND NEW.resident_id IS NOT NULL
       AND NEW.status IN ('confirmed','checked_in') THEN
      UPDATE public.rooms
      SET current_resident_id = NEW.resident_id,
          status = CASE WHEN NEW.status = 'checked_in' THEN 'occupied'::room_status ELSE 'reserved'::room_status END,
          updated_at = now()
      WHERE id = NEW.room_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;