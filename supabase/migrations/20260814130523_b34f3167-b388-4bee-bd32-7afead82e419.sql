CREATE OR REPLACE FUNCTION public.handle_cleaning_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.room_id IS NOT NULL THEN
    UPDATE public.rooms
    SET status = 'available'
    WHERE id = NEW.room_id
      AND status = 'cleaning_required';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_cleaning_completed_free_room ON public.cleaning_tasks;

CREATE TRIGGER trg_cleaning_completed_free_room
AFTER UPDATE OF status ON public.cleaning_tasks
FOR EACH ROW
WHEN (NEW.status = 'completed' AND NEW.room_id IS NOT NULL)
EXECUTE FUNCTION public.handle_cleaning_completed();