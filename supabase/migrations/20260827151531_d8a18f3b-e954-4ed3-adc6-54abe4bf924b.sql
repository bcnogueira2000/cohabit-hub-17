ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS code text;

CREATE SEQUENCE IF NOT EXISTS public.resident_code_seq;

-- Backfill por ordem de created_at
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM public.residents
  WHERE code IS NULL
)
UPDATE public.residents r
SET code = 'LC' || lpad(o.rn::text, 4, '0')
FROM ordered o
WHERE r.id = o.id;

SELECT setval('public.resident_code_seq', GREATEST((SELECT count(*) FROM public.residents), 1));

CREATE OR REPLACE FUNCTION public.set_resident_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'LC' || lpad(nextval('public.resident_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_resident_code ON public.residents;
CREATE TRIGGER trg_set_resident_code
BEFORE INSERT ON public.residents
FOR EACH ROW EXECUTE FUNCTION public.set_resident_code();

CREATE UNIQUE INDEX IF NOT EXISTS residents_code_unique ON public.residents (code);

CREATE UNIQUE INDEX IF NOT EXISTS residents_tax_number_unique
ON public.residents (tax_number)
WHERE tax_number IS NOT NULL AND tax_number != '';