ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;
UPDATE public.leads l SET status_changed_at = COALESCE(
  (SELECT max(a.created_at) FROM public.lead_activity a WHERE a.lead_id = l.id AND a.kind = 'status_changed'),
  l.created_at);
ALTER TABLE public.leads ALTER COLUMN status_changed_at SET DEFAULT now();
CREATE OR REPLACE FUNCTION public.set_lead_status_changed_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN NEW.status_changed_at := now(); END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.set_lead_status_changed_at() FROM PUBLIC, anon;
DROP TRIGGER IF EXISTS trg_leads_status_changed_at ON public.leads;
CREATE TRIGGER trg_leads_status_changed_at BEFORE UPDATE OF status ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_lead_status_changed_at();