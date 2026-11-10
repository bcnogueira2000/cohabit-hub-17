-- Notificações push no telemóvel (nova lead)
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  CONSTRAINT push_subscriptions_endpoint_https CHECK (endpoint ~ '^https://')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage own push subscriptions (select)" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff manage own push subscriptions (insert)" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
  );
CREATE POLICY "Staff manage own push subscriptions (update)" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff manage own push subscriptions (delete)" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions (user_id);

-- Marca de envio (uma notificação por lead)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS new_lead_push_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.notify_new_lead_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://rjwyxssxbknyhsnnirhq.supabase.co/functions/v1/push-nova-lead',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('lead_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_lead_push: push não enviado (%)', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_new_lead_push() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS trg_leads_new_lead_push ON public.leads;
CREATE TRIGGER trg_leads_new_lead_push
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead_push();