ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz;

-- promote: recusa assinar duas vezes e deixa de passar a lead a 'won'
DO $mig$
DECLARE
  v_def text := pg_get_functiondef('public.promote_reservation_to_contract(uuid, jsonb)'::regprocedure);
  v_new text;
BEGIN
  v_new := replace(v_def,
    E'    RAISE EXCEPTION ''Lead não encontrada'';\n  END IF;',
    E'    RAISE EXCEPTION ''Lead não encontrada'';\n  END IF;\n\n  IF v_lead.contract_id IS NOT NULL OR v_lead.contract_signed_at IS NOT NULL THEN\n    RAISE EXCEPTION ''Esta lead já foi assinada / já tem contrato'';\n  END IF;');
  v_new := replace(v_new, E'SET status = ''won'',', E'SET contract_signed_at = now(),');
  IF v_new = v_def OR position('contract_signed_at = now()' in v_new) = 0
     OR position('já foi assinada' in v_new) = 0 THEN
    RAISE EXCEPTION 'promote_reservation_to_contract: padrão não encontrado';
  END IF;
  EXECUTE v_new;
END
$mig$;

-- Avalia se a lead passa a 'won': assinada + caução paga (0 conta) + 1.ª renda paga. Só reserved -> won.
CREATE OR REPLACE FUNCTION public.evaluate_lead_won(p_lead_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    FROM public.payments WHERE contract_id = v_contract.id AND kind = 'deposit';
  IF COALESCE(v_contract.deposit_due, 0) > 0.005 AND v_deposit_paid + 0.005 < v_contract.deposit_due THEN
    RETURN false;
  END IF;

  SELECT outstanding INTO v_first_outstanding
    FROM public.rent_charge_balance
   WHERE contract_id = v_contract.id
   ORDER BY year, month LIMIT 1;
  IF v_first_outstanding IS NULL OR v_first_outstanding > 0.005 THEN
    RETURN false;
  END IF;

  UPDATE public.leads SET status = 'won', updated_at = now()
   WHERE id = p_lead_id AND status = 'reserved';
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.evaluate_lead_won(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_lead_won(uuid) TO authenticated, service_role;

-- Gatilho em pagamentos de renda/caução: nunca faz falhar o pagamento
CREATE OR REPLACE FUNCTION public.payments_evaluate_lead_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_contract_id uuid;
  v_lead_id uuid;
BEGIN
  FOR r IN SELECT * FROM (VALUES
      (CASE WHEN TG_OP <> 'DELETE' THEN NEW.kind::text END,
       CASE WHEN TG_OP <> 'DELETE' THEN NEW.contract_id END,
       CASE WHEN TG_OP <> 'DELETE' THEN NEW.rent_charge_id END),
      (CASE WHEN TG_OP <> 'INSERT' THEN OLD.kind::text END,
       CASE WHEN TG_OP <> 'INSERT' THEN OLD.contract_id END,
       CASE WHEN TG_OP <> 'INSERT' THEN OLD.rent_charge_id END)
    ) AS t(kind, contract_id, rent_charge_id)
  LOOP
    IF r.kind IS NULL OR r.kind NOT IN ('rent','deposit') THEN CONTINUE; END IF;
    BEGIN
      v_contract_id := r.contract_id;
      IF v_contract_id IS NULL AND r.rent_charge_id IS NOT NULL THEN
        SELECT contract_id INTO v_contract_id FROM public.rent_charges WHERE id = r.rent_charge_id;
      END IF;
      IF v_contract_id IS NULL THEN CONTINUE; END IF;
      SELECT id INTO v_lead_id FROM public.leads WHERE contract_id = v_contract_id LIMIT 1;
      IF v_lead_id IS NULL THEN
        SELECT lead_id INTO v_lead_id FROM public.contracts WHERE id = v_contract_id;
      END IF;
      IF v_lead_id IS NOT NULL THEN
        PERFORM public.evaluate_lead_won(v_lead_id);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'evaluate_lead_won falhou (contrato %): %', v_contract_id, SQLERRM;
    END;
  END LOOP;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.payments_evaluate_lead_won() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_payments_evaluate_lead_won ON public.payments;
CREATE TRIGGER trg_payments_evaluate_lead_won
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.payments_evaluate_lead_won();

-- "Assinou": no fim avalia logo se já está tudo pago
CREATE OR REPLACE FUNCTION public.sign_lead_contract(p_lead_id uuid, p_contract_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lead public.leads;
  v_result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) THEN
    RAISE EXCEPTION 'Sem permissão para criar contratos';
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'Lead não encontrada'; END IF;
  IF v_lead.contract_id IS NOT NULL OR v_lead.contract_signed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Esta lead já foi assinada / já tem contrato';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stays WHERE lead_id = p_lead_id AND status IN ('confirmed','checked_in')
  ) THEN
    IF v_lead.room_id IS NULL OR v_lead.planned_check_in IS NULL OR v_lead.planned_check_out IS NULL THEN
      RAISE EXCEPTION 'Falta o quarto ou as datas previstas nesta lead';
    END IF;
    PERFORM public.reserve_room_for_lead(
      p_lead_id, v_lead.room_id,
      v_lead.planned_check_in::timestamptz, v_lead.planned_check_out::timestamptz);
  END IF;

  v_result := public.promote_reservation_to_contract(p_lead_id, p_contract_data);

  BEGIN
    PERFORM public.evaluate_lead_won(p_lead_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'evaluate_lead_won falhou (lead %): %', p_lead_id, SQLERRM;
  END;

  RETURN v_result;
END;
$function$;

-- "Desistiu" recusa quando já existe contrato
CREATE OR REPLACE FUNCTION public.give_up_lead(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'staff')) THEN
    RAISE EXCEPTION 'Sem permissão para alterar leads';
  END IF;

  IF EXISTS (SELECT 1 FROM public.leads WHERE id = p_lead_id AND contract_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Já existe contrato — cancela o contrato na ficha do contrato';
  END IF;

  IF EXISTS (SELECT 1 FROM public.stays WHERE lead_id = p_lead_id AND status = 'confirmed') THEN
    PERFORM public.cancel_room_reservation(p_lead_id);
  END IF;

  UPDATE public.leads
     SET status = 'lost',
         reservation_agreement_generated_at = NULL,
         contract_generated_at = NULL,
         reservation_not_applicable = false,
         reservation_waiver_reason = NULL,
         reservation_waiver_by = NULL,
         reservation_waiver_at = NULL,
         updated_at = now()
   WHERE id = p_lead_id;
END;
$function$;