ALTER FUNCTION public.guard_payment_coherence() SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.guard_payment_coherence() FROM PUBLIC, anon, authenticated;