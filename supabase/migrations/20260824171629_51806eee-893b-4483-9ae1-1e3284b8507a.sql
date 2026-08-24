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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_resident_from_stay ON public.stays;

CREATE TRIGGER trg_sync_resident_from_stay
AFTER UPDATE OF room_id, check_in, check_out ON public.stays
FOR EACH ROW
WHEN (
  NEW.resident_id IS NOT NULL AND (
    COALESCE(OLD.room_id::text, '') IS DISTINCT FROM COALESCE(NEW.room_id::text, '')
    OR OLD.check_in IS DISTINCT FROM NEW.check_in
    OR OLD.check_out IS DISTINCT FROM NEW.check_out
  )
)
EXECUTE FUNCTION public.sync_resident_from_stay();