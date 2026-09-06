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
           '/leads'
    FROM public.user_roles ur
    WHERE ur.role IN ('staff', 'manager', 'admin')
    GROUP BY ur.user_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_staff_form_submitted() FROM anon, authenticated, PUBLIC;