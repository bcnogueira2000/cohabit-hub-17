CREATE OR REPLACE FUNCTION public.auto_create_from_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_priority task_priority;
BEGIN
  v_priority := CASE NEW.priority
    WHEN 'urgent' THEN 'high'::task_priority
    WHEN 'high' THEN 'high'::task_priority
    WHEN 'medium' THEN 'medium'::task_priority
    ELSE 'low'::task_priority END;

  IF NEW.category IN ('cleaning','consumables') THEN
    INSERT INTO public.cleaning_tasks (type, service, source, source_ref, room_id, area, scheduled_for, status, notes)
    VALUES (
      CASE WHEN NEW.category='consumables' THEN 'common'::cleaning_type ELSE 'room_regular'::cleaning_type END,
      CASE WHEN NEW.category='consumables' THEN 'simple'::cleaning_service ELSE 'normal'::cleaning_service END,
      'request'::cleaning_source,
      NEW.id::TEXT,
      NEW.room_id,
      COALESCE(NEW.location, NEW.title),
      now() + interval '1 day',
      'scheduled'::cleaning_status,
      'Gerada automaticamente do pedido ' || NEW.code
    );
  ELSE
    INSERT INTO public.ops_tasks (title, description, category, priority, request_id, room_id, resident_id, due_date)
    VALUES (
      NEW.title,
      COALESCE(NEW.description,'') || E'\n\n[Gerada automaticamente do pedido ' || NEW.code || ']',
      CASE NEW.category
        WHEN 'maintenance' THEN 'maintenance'::task_category
        WHEN 'wifi_tech' THEN 'maintenance'::task_category
        WHEN 'lost_found' THEN 'logistics'::task_category
        ELSE 'admin'::task_category END,
      v_priority,
      NEW.id,
      NEW.room_id,
      NEW.resident_id,
      now() + interval '3 days'
    );
  END IF;
  RETURN NEW;
END $function$;