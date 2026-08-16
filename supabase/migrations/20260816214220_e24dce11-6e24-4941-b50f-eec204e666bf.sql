GRANT EXECUTE ON FUNCTION public.compute_rent_for_month(uuid, int, int) TO postgres;
GRANT EXECUTE ON FUNCTION public.generate_rent_charges(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.recalculate_rent_charges(uuid) TO postgres;