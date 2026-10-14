-- 1. Sem apagar registos financeiros
CREATE OR REPLACE FUNCTION public.block_financial_delete() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Os registos financeiros não se apagam: anula-os com o motivo.';
END $$;
CREATE TRIGGER trg_payments_no_delete BEFORE DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.block_financial_delete();
CREATE TRIGGER trg_extra_charges_no_delete BEFORE DELETE ON public.extra_charges FOR EACH ROW EXECUTE FUNCTION public.block_financial_delete();

CREATE OR REPLACE FUNCTION public.guard_contract_delete() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.payments WHERE contract_id = OLD.id) THEN
    RAISE EXCEPTION 'Este contrato tem pagamentos registados e não pode ser eliminado.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.extra_charges WHERE contract_id = OLD.id) THEN
    RAISE EXCEPTION 'Este contrato tem serviços extra lançados e não pode ser eliminado.';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER trg_contracts_guard_delete BEFORE DELETE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.guard_contract_delete();

CREATE OR REPLACE FUNCTION public.guard_rent_charge_delete() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.payments WHERE rent_charge_id = OLD.id) THEN
    RAISE EXCEPTION 'Esta renda (%/%) tem pagamentos associados (mesmo anulados) e não pode ser apagada.', OLD.month, OLD.year;
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER trg_rent_charges_guard_delete BEFORE DELETE ON public.rent_charges FOR EACH ROW EXECUTE FUNCTION public.guard_rent_charge_delete();

-- 2. Campos financeiros imutáveis
CREATE OR REPLACE FUNCTION public.guard_payment_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.amount IS DISTINCT FROM NEW.amount OR OLD.kind IS DISTINCT FROM NEW.kind
     OR OLD.contract_id IS DISTINCT FROM NEW.contract_id OR OLD.lead_id IS DISTINCT FROM NEW.lead_id
     OR OLD.rent_charge_id IS DISTINCT FROM NEW.rent_charge_id OR OLD.extra_charge_id IS DISTINCT FROM NEW.extra_charge_id THEN
    RAISE EXCEPTION 'Valor, tipo e ligações de um pagamento não se alteram: anula-o e regista um novo.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_payments_immutable BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.guard_payment_immutable();

-- 3. Coerência
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);

CREATE OR REPLACE FUNCTION public.guard_payment_coherence() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_total numeric; v_paid numeric; v_status text;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  IF NEW.kind = 'rent' THEN
    IF NEW.rent_charge_id IS NULL THEN RAISE EXCEPTION 'Um pagamento de renda tem de indicar a renda.'; END IF;
    IF NEW.extra_charge_id IS NOT NULL THEN RAISE EXCEPTION 'Um pagamento de renda não pode estar ligado a um serviço extra.'; END IF;
    SELECT amount INTO v_total FROM public.rent_charges WHERE id = NEW.rent_charge_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Renda não encontrada.'; END IF;
    SELECT COALESCE(sum(amount),0) INTO v_paid FROM public.payments
     WHERE rent_charge_id = NEW.rent_charge_id AND status = 'active' AND id <> NEW.id;
    IF v_paid + NEW.amount > v_total + 0.005 THEN
      RAISE EXCEPTION 'Pagamento excede a renda: renda %, já pago %, este pagamento %, em falta %.',
        to_char(v_total,'FM999990.00'), to_char(v_paid,'FM999990.00'), to_char(NEW.amount,'FM999990.00'), to_char(v_total - v_paid,'FM999990.00');
    END IF;
  ELSIF NEW.kind = 'extra' THEN
    IF NEW.extra_charge_id IS NULL THEN RAISE EXCEPTION 'Um pagamento de extra tem de indicar o serviço extra.'; END IF;
    IF NEW.rent_charge_id IS NOT NULL THEN RAISE EXCEPTION 'Um pagamento de extra não pode estar ligado a uma renda.'; END IF;
    SELECT amount, status INTO v_total, v_status FROM public.extra_charges WHERE id = NEW.extra_charge_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Serviço extra não encontrado.'; END IF;
    IF v_status <> 'active' THEN RAISE EXCEPTION 'Este serviço extra está anulado e não aceita pagamentos.'; END IF;
    SELECT COALESCE(sum(amount),0) INTO v_paid FROM public.payments
     WHERE extra_charge_id = NEW.extra_charge_id AND status = 'active' AND id <> NEW.id;
    IF v_paid + NEW.amount > v_total + 0.005 THEN
      RAISE EXCEPTION 'Pagamento excede o serviço extra: valor %, já pago %, este pagamento %, em falta %.',
        to_char(v_total,'FM999990.00'), to_char(v_paid,'FM999990.00'), to_char(NEW.amount,'FM999990.00'), to_char(v_total - v_paid,'FM999990.00');
    END IF;
  ELSE
    IF NEW.rent_charge_id IS NOT NULL OR NEW.extra_charge_id IS NOT NULL THEN
      RAISE EXCEPTION 'Pagamentos do tipo % não podem estar ligados a uma renda nem a um serviço extra.', NEW.kind;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_payments_coherence BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.guard_payment_coherence();

-- 4. Sem contratos sobrepostos
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_sem_sobreposicao EXCLUDE USING gist
  (resident_id WITH =, daterange(start_date, end_date, '[]') WITH &&)
  WHERE (status IN ('reserved','active') AND resident_id IS NOT NULL);

-- 5. Auditoria
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  row_id uuid,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.audit_log FROM anon, authenticated;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers read audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE INDEX audit_log_table_row_idx ON public.audit_log (table_name, row_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.write_audit_log() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (table_name, row_id, action, old_data, new_data, actor_user_id)
  VALUES (TG_TABLE_NAME,
          CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
          TG_OP,
          CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END,
          auth.uid());
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.write_audit_log() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER trg_audit_rent_charges AFTER INSERT OR UPDATE OR DELETE ON public.rent_charges FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER trg_audit_extra_charges AFTER INSERT OR UPDATE OR DELETE ON public.extra_charges FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER trg_audit_contracts AFTER INSERT OR UPDATE OR DELETE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER trg_audit_service_catalog AFTER INSERT OR UPDATE OR DELETE ON public.service_catalog FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

-- Recálculo: rendas com qualquer pagamento (mesmo anulado) ficam bloqueadas em vez de apagadas
CREATE OR REPLACE FUNCTION public.recalculate_rent_charges(p_contract_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start date;
  v_end date;
  v_cursor date;
  v_created int := 0;
  v_updated int := 0;
  v_deleted int := 0;
  v_locked jsonb := '[]'::jsonb;
  v_y int;
  v_m int;
  v_existing record;
  v_has_payment boolean;
  r record;
  o record;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'Sem permissão para recalcular rendas';
  END IF;

  SELECT c.start_date, COALESCE(c.actual_end_date, c.end_date)
    INTO v_start, v_end
  FROM public.contracts c WHERE c.id = p_contract_id;

  IF v_start IS NULL THEN
    RAISE EXCEPTION 'Contrato não encontrado';
  END IF;

  v_cursor := date_trunc('month', v_start)::date;
  WHILE v_cursor <= v_end LOOP
    v_y := EXTRACT(YEAR FROM v_cursor)::int;
    v_m := EXTRACT(MONTH FROM v_cursor)::int;

    SELECT * INTO r FROM public.compute_rent_for_month(p_contract_id, v_y, v_m);

    SELECT * INTO v_existing FROM public.rent_charges rc
    WHERE rc.contract_id = p_contract_id AND rc.year = v_y AND rc.month = v_m;

    IF v_existing.id IS NULL THEN
      IF r.o_amount IS NOT NULL AND r.o_amount > 0 THEN
        INSERT INTO public.rent_charges (contract_id, year, month, amount, due_date, prorated)
        VALUES (p_contract_id, v_y, v_m, r.o_amount, r.o_due_date, r.o_prorated);
        v_created := v_created + 1;
      END IF;
    ELSE
      SELECT EXISTS (SELECT 1 FROM public.payments p WHERE p.rent_charge_id = v_existing.id)
        INTO v_has_payment;

      IF v_has_payment THEN
        IF r.o_amount IS NULL OR r.o_amount <> v_existing.amount THEN
          v_locked := v_locked || jsonb_build_object(
            'id', v_existing.id,
            'year', v_y,
            'month', v_m,
            'current_amount', v_existing.amount,
            'expected_amount', r.o_amount
          );
        END IF;
      ELSIF r.o_amount IS NULL OR r.o_amount <= 0 THEN
        DELETE FROM public.rent_charges WHERE id = v_existing.id;
        v_deleted := v_deleted + 1;
      ELSIF r.o_amount <> v_existing.amount
         OR r.o_prorated <> v_existing.prorated
         OR r.o_due_date <> v_existing.due_date THEN
        UPDATE public.rent_charges
        SET amount = r.o_amount, prorated = r.o_prorated, due_date = r.o_due_date
        WHERE id = v_existing.id;
        v_updated := v_updated + 1;
      END IF;
    END IF;

    v_cursor := (v_cursor + interval '1 month')::date;
  END LOOP;

  FOR o IN
    SELECT rc.id, rc.year, rc.month, rc.amount,
           EXISTS (SELECT 1 FROM public.payments p WHERE p.rent_charge_id = rc.id) AS has_payment
    FROM public.rent_charges rc
    WHERE rc.contract_id = p_contract_id
      AND (
        make_date(rc.year, rc.month, 1) < date_trunc('month', v_start)::date
        OR make_date(rc.year, rc.month, 1) > date_trunc('month', v_end)::date
      )
  LOOP
    IF o.has_payment THEN
      v_locked := v_locked || jsonb_build_object(
        'id', o.id,
        'year', o.year,
        'month', o.month,
        'current_amount', o.amount,
        'expected_amount', NULL
      );
    ELSE
      DELETE FROM public.rent_charges WHERE id = o.id;
      v_deleted := v_deleted + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'deleted', v_deleted,
    'locked_count', jsonb_array_length(v_locked),
    'locked', v_locked
  );
END;
$function$;