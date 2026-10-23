CREATE OR REPLACE FUNCTION public.set_resident_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    -- Serializa a atribuição: duas criações simultâneas nunca calculam o mesmo número.
    PERFORM pg_advisory_xact_lock(hashtext('public.residents.code'));
    SELECT min(g) INTO n
    FROM generate_series(1, COALESCE((SELECT max(substring(code from 3)::int) FROM public.residents WHERE code ~ '^LC[0-9]+$'), 0) + 1) g
    WHERE NOT EXISTS (SELECT 1 FROM public.residents r WHERE r.code = 'LC' || lpad(g::text, 4, '0'));
    NEW.code := 'LC' || lpad(n::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE UNIQUE INDEX IF NOT EXISTS residents_code_unique ON public.residents (code);

-- O código é o número de cliente no Moloni: depois de atribuído não muda.
CREATE OR REPLACE FUNCTION public.lock_resident_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.code IS NOT NULL AND NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'O código do residente não pode ser alterado.';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_lock_resident_code ON public.residents;
CREATE TRIGGER trg_lock_resident_code BEFORE UPDATE OF code ON public.residents
FOR EACH ROW EXECUTE FUNCTION public.lock_resident_code();

-- Residentes com histórico não se apagam (passam a Ex-residente), para o código nunca ser reutilizado noutra pessoa.
CREATE OR REPLACE FUNCTION public.block_resident_delete_with_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.moloni_customer_id IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.contracts WHERE resident_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.extra_charges WHERE resident_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.resident_documents WHERE resident_id = OLD.id) THEN
    RAISE EXCEPTION 'Este residente tem contratos, documentos ou ficha no Moloni e não pode ser apagado. Marca-o como Ex-residente.';
  END IF;
  RETURN OLD;
END; $$;
DROP TRIGGER IF EXISTS trg_block_resident_delete ON public.residents;
CREATE TRIGGER trg_block_resident_delete BEFORE DELETE ON public.residents
FOR EACH ROW EXECUTE FUNCTION public.block_resident_delete_with_history();

COMMENT ON SEQUENCE public.resident_code_seq IS 'DEPRECATED: resident codes now fill the lowest free number';