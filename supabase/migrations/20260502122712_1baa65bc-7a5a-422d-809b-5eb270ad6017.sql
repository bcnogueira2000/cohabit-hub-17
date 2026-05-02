-- Keep auto-generated tasks in sync when a request is assigned/reassigned
CREATE OR REPLACE FUNCTION public.sync_request_assignment_to_generated_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to)
     AND (OLD.assigned_to_user_id IS NOT DISTINCT FROM NEW.assigned_to_user_id) THEN
    RETURN NEW;
  END IF;

  UPDATE public.ops_tasks
  SET assigned_to = NEW.assigned_to,
      assigned_to_user_id = NEW.assigned_to_user_id,
      updated_at = now()
  WHERE request_id = NEW.id;

  UPDATE public.cleaning_tasks
  SET assigned_to = NEW.assigned_to,
      assigned_to_user_id = NEW.assigned_to_user_id,
      updated_at = now()
  WHERE source = 'request'
    AND source_ref = NEW.id::text;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_request_assignment_to_generated_task ON public.requests;
CREATE TRIGGER trg_sync_request_assignment_to_generated_task
AFTER INSERT OR UPDATE OF assigned_to, assigned_to_user_id ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_request_assignment_to_generated_task();

-- Backfill existing auto-generated tasks from already-assigned requests
UPDATE public.ops_tasks t
SET assigned_to = r.assigned_to,
    assigned_to_user_id = r.assigned_to_user_id,
    updated_at = now()
FROM public.requests r
WHERE t.request_id = r.id
  AND r.assigned_to_user_id IS NOT NULL
  AND t.assigned_to_user_id IS DISTINCT FROM r.assigned_to_user_id;

UPDATE public.cleaning_tasks c
SET assigned_to = r.assigned_to,
    assigned_to_user_id = r.assigned_to_user_id,
    updated_at = now()
FROM public.requests r
WHERE c.source = 'request'
  AND c.source_ref = r.id::text
  AND r.assigned_to_user_id IS NOT NULL
  AND c.assigned_to_user_id IS DISTINCT FROM r.assigned_to_user_id;