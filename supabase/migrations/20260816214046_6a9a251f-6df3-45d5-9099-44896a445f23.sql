-- Helper: calcula o valor de um mês para um contrato, com pró-rata por dias
CREATE OR REPLACE FUNCTION public.compute_rent_for_month(
  p_contract_id uuid,
  p_year int,
  p_month int,
  OUT o_amount numeric,
  OUT o_prorated boolean,
  OUT o_due_date date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end date;
  v_payment_day int;
  v_month_start date;
  v_month_end date;
  v_cover_start date;
  v_cover_end date;
  v_days_in_month int;
  v_day date;
  v_rate numeric;
  v_first_rate numeric;
  v_distinct_rates int := 0;
  v_prev_rate numeric;
  v_sum numeric := 0;
BEGIN
  SELECT c.start_date, COALESCE(c.actual_end_date, c.end_date), c.payment_day
    INTO v_start, v_end, v_payment_day
  FROM public.contracts c WHERE c.id = p_contract_id;

  IF v_start IS NULL THEN
    RETURN;
  END IF;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month - 1 day')::date;
  v_days_in_month := EXTRACT(DAY FROM v_month_end)::int;

  v_cover_start := GREATEST(v_start, v_month_start);
  v_cover_end := LEAST(v_end, v_month_end);

  IF v_cover_start > v_cover_end THEN
    RETURN; -- mês fora do contrato
  END IF;

  -- soma dia a dia usando o escalão em vigor em cada dia
  v_day := v_cover_start;
  WHILE v_day <= v_cover_end LOOP
    SELECT rp.monthly_amount INTO v_rate
    FROM public.contract_rent_periods rp
    WHERE rp.contract_id = p_contract_id AND rp.valid_from <= v_day
    ORDER BY rp.valid_from DESC
    LIMIT 1;

    IF v_rate IS NULL THEN
      -- antes do primeiro escalão: usa o mais antigo
      SELECT rp.monthly_amount INTO v_rate
      FROM public.contract_rent_periods rp
      WHERE rp.contract_id = p_contract_id
      ORDER BY rp.valid_from ASC
      LIMIT 1;
    END IF;

    IF v_rate IS NULL THEN
      RETURN; -- sem escalões definidos
    END IF;

    IF v_prev_rate IS NULL OR v_rate <> v_prev_rate THEN
      v_distinct_rates := v_distinct_rates + 1;
      v_prev_rate := v_rate;
    END IF;
    IF v_first_rate IS NULL THEN
      v_first_rate := v_rate;
    END IF;

    v_sum := v_sum + (v_rate / v_days_in_month);
    v_day := v_day + 1;
  END LOOP;

  IF v_cover_start = v_month_start
     AND v_cover_end = v_month_end
     AND v_distinct_rates = 1 THEN
    o_amount := ROUND(v_first_rate, 2);
    o_prorated := false;
  ELSE
    o_amount := ROUND(v_sum, 2);
    o_prorated := true;
  END IF;

  o_due_date := make_date(p_year, p_month, LEAST(GREATEST(COALESCE(v_payment_day, 1), 1), v_days_in_month));
END;
$$;

-- Gera as rendas em falta (nunca duplica)
CREATE OR REPLACE FUNCTION public.generate_rent_charges(p_contract_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end date;
  v_cursor date;
  v_created int := 0;
  r record;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'Sem permissão para gerar rendas';
  END IF;

  SELECT c.start_date, COALESCE(c.actual_end_date, c.end_date)
    INTO v_start, v_end
  FROM public.contracts c WHERE c.id = p_contract_id;

  IF v_start IS NULL THEN
    RAISE EXCEPTION 'Contrato não encontrado';
  END IF;

  v_cursor := date_trunc('month', v_start)::date;
  WHILE v_cursor <= v_end LOOP
    SELECT * INTO r FROM public.compute_rent_for_month(
      p_contract_id,
      EXTRACT(YEAR FROM v_cursor)::int,
      EXTRACT(MONTH FROM v_cursor)::int
    );

    IF r.o_amount IS NOT NULL AND r.o_amount > 0
       AND NOT EXISTS (
         SELECT 1 FROM public.rent_charges rc
         WHERE rc.contract_id = p_contract_id
           AND rc.year = EXTRACT(YEAR FROM v_cursor)::int
           AND rc.month = EXTRACT(MONTH FROM v_cursor)::int
       ) THEN
      INSERT INTO public.rent_charges (contract_id, year, month, amount, due_date, prorated)
      VALUES (p_contract_id, EXTRACT(YEAR FROM v_cursor)::int, EXTRACT(MONTH FROM v_cursor)::int,
              r.o_amount, r.o_due_date, r.o_prorated);
      v_created := v_created + 1;
    END IF;

    v_cursor := (v_cursor + interval '1 month')::date;
  END LOOP;

  RETURN v_created;
END;
$$;

-- Recalcula todas as rendas, sem tocar em rendas com pagamentos associados
CREATE OR REPLACE FUNCTION public.recalculate_rent_charges(p_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end date;
  v_cursor date;
  v_created int := 0;
  v_updated int := 0;
  v_locked jsonb := '[]'::jsonb;
  v_y int;
  v_m int;
  v_existing record;
  v_has_payment boolean;
  r record;
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

  RETURN jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'locked_count', jsonb_array_length(v_locked),
    'locked', v_locked
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_rent_charges(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_rent_charges(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_rent_for_month(uuid, int, int) TO authenticated;