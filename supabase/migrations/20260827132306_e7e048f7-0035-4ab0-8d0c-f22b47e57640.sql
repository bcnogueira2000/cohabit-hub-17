CREATE TABLE public.moloni_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  singleton boolean NOT NULL DEFAULT true,
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone,
  company_id integer,
  company_name text,
  account_email text,
  last_connected_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT moloni_credentials_singleton_uniq UNIQUE (singleton)
);

GRANT SELECT ON public.moloni_credentials TO authenticated;
GRANT ALL ON public.moloni_credentials TO service_role;

ALTER TABLE public.moloni_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view moloni credentials"
ON public.moloni_credentials FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TABLE public.moloni_sync_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.moloni_sync_log TO authenticated;
GRANT ALL ON public.moloni_sync_log TO service_role;

ALTER TABLE public.moloni_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view moloni sync log"
ON public.moloni_sync_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE INDEX moloni_sync_log_created_at_idx ON public.moloni_sync_log (created_at DESC);

CREATE TRIGGER update_moloni_credentials_updated_at
BEFORE UPDATE ON public.moloni_credentials
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();