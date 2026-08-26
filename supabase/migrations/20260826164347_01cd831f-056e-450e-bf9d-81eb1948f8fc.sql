REVOKE EXECUTE ON FUNCTION public.generate_rent_charges(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_rent_charges(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.compute_rent_for_month(uuid, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_finance_alerts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_resident_id() FROM PUBLIC;

ALTER TABLE public.bookings DROP COLUMN IF EXISTS space_id_deprecated;
DROP TABLE IF EXISTS public.spaces_deprecated;