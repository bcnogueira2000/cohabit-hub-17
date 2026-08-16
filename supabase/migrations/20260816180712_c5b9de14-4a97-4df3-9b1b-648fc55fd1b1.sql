DROP POLICY IF EXISTS "Authenticated can read app settings" ON public.app_settings;

CREATE POLICY "Staff can read app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));