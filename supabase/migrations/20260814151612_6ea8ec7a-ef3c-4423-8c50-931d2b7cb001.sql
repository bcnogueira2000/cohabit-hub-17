CREATE TYPE public.lead_status AS ENUM ('new','contacted','visit_scheduled','visited','proposal_sent','negotiating','won','lost','archived');
CREATE TYPE public.lead_source AS ENUM ('website_form','idealista','instagram','linkedin','referral','walk_in','email','phone','other');

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  nationality TEXT,
  gender TEXT,
  age TEXT,
  profile TEXT,
  profile_other TEXT,
  source public.lead_source NOT NULL DEFAULT 'other',
  source_detail TEXT,
  preferred_room_type TEXT,
  preferred_move_in TEXT,
  stay_duration TEXT,
  what_brings_them TEXT,
  budget_range TEXT,
  status public.lead_status NOT NULL DEFAULT 'new',
  assigned_to TEXT,
  assigned_to_user_id UUID,
  notes TEXT,
  next_action TEXT,
  next_action_date DATE,
  stay_id UUID REFERENCES public.stays(id) ON DELETE SET NULL,
  lost_reason TEXT,
  external_ref TEXT,
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff full access leads" ON public.leads
FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_source ON public.leads(source);
CREATE INDEX idx_leads_next_action_date ON public.leads(next_action_date);
CREATE INDEX idx_leads_assigned_to_user_id ON public.leads(assigned_to_user_id);

CREATE TRIGGER set_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lead_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  actor_user_id UUID,
  actor_name TEXT,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activity TO authenticated;
GRANT ALL ON public.lead_activity TO service_role;

ALTER TABLE public.lead_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff full access lead_activity" ON public.lead_activity
FOR ALL TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE INDEX idx_lead_activity_lead_created ON public.lead_activity(lead_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.lead_log_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.lead_activity (lead_id, actor_user_id, kind, payload)
    VALUES (NEW.id, auth.uid(), 'status_changed',
            jsonb_build_object('from', OLD.status::text, 'to', NEW.status::text));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_status_changed
AFTER UPDATE OF status ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.lead_log_status_change();