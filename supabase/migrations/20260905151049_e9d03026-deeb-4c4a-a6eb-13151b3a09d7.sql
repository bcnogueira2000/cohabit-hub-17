ALTER TABLE public.stays ADD COLUMN IF NOT EXISTS expected_check_in timestamptz;
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS expected_arrival_date timestamptz;

UPDATE public.stays SET expected_check_in = check_in WHERE expected_check_in IS NULL;

UPDATE public.residents r
SET expected_arrival_date = s.expected_check_in
FROM public.stays s
WHERE s.resident_id = r.id
  AND r.expected_arrival_date IS NULL
  AND s.expected_check_in IS NOT NULL;

UPDATE public.residents SET expected_arrival_date = move_in
WHERE expected_arrival_date IS NULL AND move_in IS NOT NULL;

-- default: expected_check_in = check_in quando não indicado
CREATE OR REPLACE FUNCTION public.stays_default_expected_check_in()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expected_check_in IS NULL THEN
    NEW.expected_check_in := NEW.check_in;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stays_default_expected_check_in() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_stays_default_expected_check_in ON public.stays;
CREATE TRIGGER trg_stays_default_expected_check_in
BEFORE INSERT OR UPDATE OF check_in, expected_check_in ON public.stays
FOR EACH ROW
EXECUTE FUNCTION public.stays_default_expected_check_in();

-- sincronizar residente a partir da estadia (inclui data prevista)
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
        expected_arrival_date = COALESCE(NEW.expected_check_in, NEW.check_in),
        updated_at = now()
    WHERE id = NEW.resident_id;
  END IF;

  -- quarto mudou: libertar o antigo e ocupar o novo
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.room_id::text,'') IS DISTINCT FROM COALESCE(NEW.room_id::text,'') THEN
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

REVOKE ALL ON FUNCTION public.sync_resident_from_stay() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_resident_from_stay ON public.stays;
CREATE TRIGGER trg_sync_resident_from_stay
AFTER INSERT OR UPDATE OF room_id, check_in, check_out, expected_check_in, resident_id ON public.stays
FOR EACH ROW
WHEN (
  NEW.resident_id IS NOT NULL
)
EXECUTE FUNCTION public.sync_resident_from_stay();