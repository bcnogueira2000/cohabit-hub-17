REVOKE ALL ON FUNCTION public.generate_rent_charges(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recalculate_rent_charges(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.compute_rent_for_month(uuid, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_rent_charges(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_rent_charges(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_rent_for_month(uuid, int, int) TO authenticated, service_role;