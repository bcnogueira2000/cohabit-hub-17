DROP POLICY IF EXISTS "authenticated read room_typologies" ON public.room_typologies;
DROP POLICY IF EXISTS "authenticated read typology_prices" ON public.typology_prices;
CREATE POLICY "staff read room_typologies" ON public.room_typologies FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff read typology_prices" ON public.typology_prices FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));