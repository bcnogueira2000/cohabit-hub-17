CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO authenticated;
GRANT INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read app settings"
ON public.app_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can insert app settings"
ON public.app_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can update app settings"
ON public.app_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE OR REPLACE FUNCTION public.set_app_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.set_app_settings_updated_at();

INSERT INTO public.app_settings (key, value) VALUES
  ('operation_name', 'Living Colours AR'),
  ('timezone', 'Europe/Lisbon'),
  ('sla_urgent', '2 horas'),
  ('sla_high', '8 horas'),
  ('sla_medium', '24 horas'),
  ('sla_low', '72 horas');