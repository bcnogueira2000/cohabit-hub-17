CREATE OR REPLACE FUNCTION public.notify_staff_form_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.form_submitted_at IS NULL AND NEW.form_submitted_at IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT ur.user_id,
           'form_submitted',
           'Formulário preenchido: ' || NEW.full_name,
           'O candidato submeteu o formulário de candidatura.',
           '/app/leads?lead=' || NEW.id::text
    FROM public.user_roles ur
    WHERE ur.role IN ('staff', 'manager', 'admin')
    GROUP BY ur.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_notify_form_submitted ON public.leads;
CREATE TRIGGER trg_leads_notify_form_submitted
AFTER UPDATE OF form_submitted_at ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_form_submitted();