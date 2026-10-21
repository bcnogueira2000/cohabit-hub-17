CREATE OR REPLACE FUNCTION public.guard_cost_invoice_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF pg_trigger_depth() > 1 AND NOT EXISTS (SELECT 1 FROM public.cost_invoices WHERE id = OLD.invoice_id) THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Cost invoice history cannot be deleted directly';
 ELSIF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'Cost invoice history is immutable';
 END IF;
 IF NOT COALESCE(public.is_staff(auth.uid()),false) THEN RAISE EXCEPTION 'Staff access required'; END IF;
 NEW.user_id := auth.uid();
 SELECT NULLIF(trim(full_name), '') INTO NEW.user_name FROM public.profiles WHERE user_id = auth.uid();
 IF NEW.user_name IS NULL THEN
  SELECT email INTO NEW.user_name FROM public.profiles WHERE user_id = auth.uid();
 END IF;
 NEW.created_at := now(); RETURN NEW;
END;
$$;