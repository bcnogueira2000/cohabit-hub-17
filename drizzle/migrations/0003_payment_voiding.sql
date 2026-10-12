-- 1. Anulação lógica e origem dos pagamentos
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS voided_by uuid,
  ADD COLUMN IF NOT EXISTS voided_by_name text,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (status IN ('active','voided'));
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_source_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_source_check CHECK (source IN ('manual','moloni'));
UPDATE public.payments SET source = 'moloni' WHERE notes = 'Importado do Moloni' AND source <> 'moloni';
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);

-- 2. Histórico do contrato
CREATE TABLE IF NOT EXISTS public.contract_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  actor_user_id uuid,
  actor_name text,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contract_activity TO authenticated;
GRANT ALL ON public.contract_activity TO service_role;
ALTER TABLE public.contract_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers read contract_activity" ON public.contract_activity
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE INDEX IF NOT EXISTS contract_activity_contract_idx ON public.contract_activity(contract_id, created_at DESC);

-- 3. Saldo das mensalidades ignora pagamentos anulados
CREATE OR REPLACE VIEW public.rent_charge_balance AS
 SELECT rc.id, rc.contract_id, rc.year, rc.month, rc.amount, rc.due_date, rc.prorated, rc.notes, rc.created_at,
    COALESCE(sum(p.amount), 0::numeric) AS paid,
    rc.amount - COALESCE(sum(p.amount), 0::numeric) AS outstanding,
    CASE
      WHEN rc.amount - COALESCE(sum(p.amount), 0::numeric) <= 0.005 THEN 'paid'::text
      WHEN COALESCE(sum(p.amount), 0::numeric) > 0::numeric THEN 'partial'::text
      WHEN rc.due_date < CURRENT_DATE THEN 'overdue'::text
      ELSE 'due'::text
    END AS payment_state
   FROM public.rent_charges rc
   LEFT JOIN public.payments p ON p.rent_charge_id = rc.id AND p.status = 'active'
  GROUP BY rc.id;

-- 4. Condição de 'won' ignora anulados
CREATE OR REPLACE FUNCTION public.evaluate_lead_won(p_lead_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_lead public.leads;
  v_contract public.contracts;
  v_deposit_paid numeric;
  v_first_outstanding numeric;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF v_lead.id IS NULL OR v_lead.status <> 'reserved' OR v_lead.contract_signed_at IS NULL THEN
    RETURN false;
  END IF;
  SELECT * INTO v_contract FROM public.contracts
   WHERE id = v_lead.contract_id OR (v_lead.contract_id IS NULL AND lead_id = p_lead_id)
   ORDER BY created_at DESC LIMIT 1;
  IF v_contract.id IS NULL THEN RETURN false; END IF;
  SELECT COALESCE(sum(amount), 0) INTO v_deposit_paid
    FROM public.payments WHERE contract_id = v_contract.id AND kind = 'deposit' AND status = 'active';
  IF COALESCE(v_contract.deposit_due, 0) > 0.005 AND v_deposit_paid + 0.005 < v_contract.deposit_due THEN
    RETURN false;
  END IF;
  SELECT outstanding INTO v_first_outstanding
    FROM public.rent_charge_balance WHERE contract_id = v_contract.id ORDER BY year, month LIMIT 1;
  IF v_first_outstanding IS NULL OR v_first_outstanding > 0.005 THEN
    RETURN false;
  END IF;
  UPDATE public.leads SET status = 'won', updated_at = now() WHERE id = p_lead_id AND status = 'reserved';
  RETURN true;
END;
$function$;

-- 5. Outras funções que leem pagamentos passam a ignorar anulados
DO $$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.recalculate_rent_charges(uuid)'::regprocedure) INTO d;
  d := replace(d, 'WHERE p.rent_charge_id = v_existing.id)', 'WHERE p.rent_charge_id = v_existing.id AND p.status = ''active'')');
  d := replace(d, 'WHERE p.rent_charge_id = rc.id)', 'WHERE p.rent_charge_id = rc.id AND p.status = ''active'')');
  IF position('p.status = ''active''' in d) = 0 THEN RAISE EXCEPTION 'recalculate_rent_charges: padrão não encontrado'; END IF;
  EXECUTE d;
  SELECT pg_get_functiondef('public.reserve_room_without_fee(uuid,text)'::regprocedure) INTO d;
  d := replace(d, 'WHERE lead_id = p_lead_id AND kind = ''booking_fee'')', 'WHERE lead_id = p_lead_id AND kind = ''booking_fee'' AND status = ''active'')');
  IF position('AND status = ''active''' in d) = 0 THEN RAISE EXCEPTION 'reserve_room_without_fee: padrão não encontrado'; END IF;
  EXECUTE d;
END $$;

-- 6. Totais de caução do contrato sempre recalculados a partir dos pagamentos ativos
CREATE OR REPLACE FUNCTION public.recompute_contract_deposits(p_contract_id uuid)
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  UPDATE public.contracts c SET
    deposit_received = COALESCE((SELECT sum(amount) FROM public.payments WHERE contract_id = c.id AND kind = 'deposit' AND status = 'active'), 0),
    deposit_returned = COALESCE((SELECT sum(amount) FROM public.payments WHERE contract_id = c.id AND kind = 'deposit_return' AND status = 'active'), 0),
    updated_at = now()
  WHERE c.id = p_contract_id;
$$;
REVOKE ALL ON FUNCTION public.recompute_contract_deposits(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_contract_deposits(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.payments_recompute_deposits()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP <> 'DELETE' AND NEW.kind IN ('deposit','deposit_return') AND NEW.contract_id IS NOT NULL THEN
    PERFORM public.recompute_contract_deposits(NEW.contract_id);
  END IF;
  IF TG_OP <> 'INSERT' AND OLD.kind IN ('deposit','deposit_return') AND OLD.contract_id IS NOT NULL
     AND (TG_OP = 'DELETE' OR OLD.contract_id IS DISTINCT FROM NEW.contract_id) THEN
    PERFORM public.recompute_contract_deposits(OLD.contract_id);
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_payments_recompute_deposits ON public.payments;
CREATE TRIGGER trg_payments_recompute_deposits
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.payments_recompute_deposits();

-- 7. Registo atómico de caução / devolução
CREATE OR REPLACE FUNCTION public.register_deposit_payment(
  p_contract_id uuid, p_kind text, p_amount numeric, p_paid_at date,
  p_method text, p_reference text DEFAULT NULL)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) THEN
    RAISE EXCEPTION 'Sem permissão para registar pagamentos';
  END IF;
  IF p_kind NOT IN ('deposit','deposit_return') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Indica um valor superior a zero'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.contracts WHERE id = p_contract_id) THEN RAISE EXCEPTION 'Contrato não encontrado'; END IF;
  INSERT INTO public.payments (contract_id, kind, amount, paid_at, method, reference, source)
  VALUES (p_contract_id, p_kind::payment_kind, p_amount, p_paid_at, NULLIF(p_method,'')::payment_method, NULLIF(trim(COALESCE(p_reference,'')),''), 'manual')
  RETURNING id INTO v_id;
  PERFORM public.recompute_contract_deposits(p_contract_id);
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.register_deposit_payment(uuid,text,numeric,date,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_deposit_payment(uuid,text,numeric,date,text,text) TO authenticated, service_role;

-- 8. Anular pagamento
CREATE OR REPLACE FUNCTION public.void_payment(p_payment_id uuid, p_reason text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_p public.payments;
  v_actor uuid := auth.uid();
  v_actor_name text;
  v_contract_id uuid;
  v_lead_id uuid;
  v_payload jsonb;
BEGIN
  IF NOT (public.has_role(v_actor,'admin') OR public.has_role(v_actor,'manager')) THEN
    RAISE EXCEPTION 'Só administradores ou gestores podem anular pagamentos';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Indica o motivo da anulação';
  END IF;
  SELECT * INTO v_p FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'Pagamento não encontrado'; END IF;
  IF v_p.status = 'voided' THEN RAISE EXCEPTION 'Este pagamento já foi anulado'; END IF;
  IF v_p.source = 'moloni' THEN
    RAISE EXCEPTION 'Pagamento importado do Moloni: anula-o no Moloni (não se anula na app)';
  END IF;

  SELECT full_name INTO v_actor_name FROM public.profiles WHERE user_id = v_actor;

  UPDATE public.payments
     SET status = 'voided', void_reason = trim(p_reason), voided_by = v_actor,
         voided_by_name = v_actor_name, voided_at = now()
   WHERE id = p_payment_id;

  v_contract_id := v_p.contract_id;
  IF v_contract_id IS NULL AND v_p.rent_charge_id IS NOT NULL THEN
    SELECT contract_id INTO v_contract_id FROM public.rent_charges WHERE id = v_p.rent_charge_id;
  END IF;
  IF v_contract_id IS NOT NULL THEN
    PERFORM public.recompute_contract_deposits(v_contract_id);
  END IF;

  v_lead_id := v_p.lead_id;
  IF v_lead_id IS NULL AND v_contract_id IS NOT NULL THEN
    SELECT id INTO v_lead_id FROM public.leads WHERE contract_id = v_contract_id LIMIT 1;
    IF v_lead_id IS NULL THEN SELECT lead_id INTO v_lead_id FROM public.contracts WHERE id = v_contract_id; END IF;
  END IF;

  v_payload := jsonb_build_object('payment_id', v_p.id, 'kind', v_p.kind, 'amount', v_p.amount,
    'paid_at', v_p.paid_at, 'reference', v_p.reference, 'reason', trim(p_reason), 'voided_at', now());

  IF v_contract_id IS NOT NULL THEN
    INSERT INTO public.contract_activity (contract_id, actor_user_id, actor_name, kind, payload)
    VALUES (v_contract_id, v_actor, v_actor_name, 'payment_voided', v_payload);
  END IF;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_activity (lead_id, actor_user_id, actor_name, kind, payload)
    VALUES (v_lead_id, v_actor, v_actor_name, 'payment_voided', v_payload);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.void_payment(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_payment(uuid,text) TO authenticated, service_role;