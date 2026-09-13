-- 1) archived -> lost
UPDATE public.leads SET status = 'lost' WHERE status = 'archived';

ALTER TYPE public.lead_status RENAME TO lead_status_old;
CREATE TYPE public.lead_status AS ENUM ('new','contacted','visit_scheduled','visited','proposal_sent','negotiating','reserved','won','lost');
DROP TRIGGER IF EXISTS trg_lead_status_changed ON public.leads;
ALTER TABLE public.leads ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.leads ALTER COLUMN status TYPE public.lead_status USING status::text::public.lead_status;
ALTER TABLE public.leads ALTER COLUMN status SET DEFAULT 'new';
CREATE TRIGGER trg_lead_status_changed AFTER UPDATE OF status ON public.leads FOR EACH ROW EXECUTE FUNCTION public.lead_log_status_change();
DROP TYPE public.lead_status_old;

-- 2) form_sent_at + email de revisão
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS form_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS form_review_email_sent_at timestamptz;

UPDATE public.leads
   SET form_sent_at = public_token_expires_at - interval '14 days'
 WHERE public_token IS NOT NULL AND form_sent_at IS NULL AND public_token_expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_lead_form_token(p_lead_id uuid)
 RETURNS TABLE(token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_token text;
  v_expires timestamptz;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role'
     AND NOT (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Sem permissão para gerar o formulário de candidatura';
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_expires := now() + interval '14 days';

  UPDATE public.leads
     SET public_token = v_token,
         public_token_expires_at = v_expires,
         form_sent_at = now(),
         updated_at = now()
   WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidatura não encontrada';
  END IF;

  RETURN QUERY SELECT v_token, v_expires;
END;
$function$;

-- 3) pg_net + email à equipa quando o formulário é submetido
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_staff_form_submitted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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

    BEGIN
      PERFORM net.http_post(
        url := 'https://rjwyxssxbknyhsnnirhq.supabase.co/functions/v1/notificar-formulario-preenchido',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := jsonb_build_object('lead_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_staff_form_submitted: email não enviado (%)', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;