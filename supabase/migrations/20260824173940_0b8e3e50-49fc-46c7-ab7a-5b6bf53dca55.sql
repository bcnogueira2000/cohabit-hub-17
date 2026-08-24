ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS document_validity date,
  ADD COLUMN IF NOT EXISTS profile text;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

CREATE SEQUENCE IF NOT EXISTS public.contracts_code_seq;

CREATE OR REPLACE FUNCTION public.gen_contract_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'CONTR-' || to_char(COALESCE(NEW.created_at, now()), 'YYYY') || '-' ||
                lpad(nextval('public.contracts_code_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_gen_contract_code ON public.contracts;
CREATE TRIGGER trg_gen_contract_code
BEFORE INSERT ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.gen_contract_code();

-- backfill existing contracts
UPDATE public.contracts
SET code = 'CONTR-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('public.contracts_code_seq')::TEXT, 3, '0')
WHERE code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_code_key ON public.contracts (code);

CREATE OR REPLACE FUNCTION public.compensation_months(p_start date, p_end date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_start IS NULL OR p_end IS NULL THEN 1
    WHEN (date_part('year', age(p_end, p_start)) * 12 + date_part('month', age(p_end, p_start))) <= 3 THEN 1
    WHEN (date_part('year', age(p_end, p_start)) * 12 + date_part('month', age(p_end, p_start))) <= 6 THEN 2
    ELSE 3
  END::int
$function$;