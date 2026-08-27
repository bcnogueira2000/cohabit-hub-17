UPDATE public.locations
SET code = 'AR1ESIS2', updated_at = now()
WHERE name = 'WC Comum 1ES-2'
  AND apartment = '1ES'
  AND code IS DISTINCT FROM 'AR1ESIS2';