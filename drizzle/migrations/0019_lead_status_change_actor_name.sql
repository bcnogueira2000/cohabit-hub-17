CREATE OR REPLACE FUNCTION public.lead_log_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_name text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE user_id = auth.uid();
    INSERT INTO public.lead_activity (lead_id, actor_user_id, actor_name, kind, payload)
    VALUES (NEW.id, auth.uid(), v_actor_name, 'status_changed',
            jsonb_build_object('from', OLD.status::text, 'to', NEW.status::text));
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.lead_activity la
SET actor_name = p.full_name
FROM public.profiles p
WHERE la.actor_name IS NULL
  AND la.actor_user_id IS NOT NULL
  AND p.user_id = la.actor_user_id;