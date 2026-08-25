CREATE OR REPLACE FUNCTION public.compute_rent_for_month(p_contract_id uuid, p_year integer, p_month integer, OUT o_amount numeric, OUT o_prorated boolean, OUT o_due_date date)
 RETURNS record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  v_day := v_cover_start;
  WHILE v_day <= v_cover_end LOOP
    SELECT rp.monthly_amount INTO v_rate
    FROM public.contract_rent_periods rp
    WHERE rp.contract_id = p_contract_id AND rp.valid_from <= v_day
    ORDER BY rp.valid_from DESC
    LIMIT 1;

    IF v_rate IS NULL THEN
      SELECT rp.monthly_amount INTO v_rate
      FROM public.contract_rent_periods rp
      WHERE rp.contract_id = p_contract_id
      ORDER BY rp.valid_from ASC
      LIMIT 1;
    END IF;

    IF v_rate IS NULL THEN
      RETURN;
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

  o_due_date := LEAST(
    v_cover_end,
    GREATEST(
      v_cover_start,
      make_date(p_year, p_month, LEAST(GREATEST(COALESCE(v_payment_day, 5), 1), v_days_in_month))
    )
  );
END;
$function$;

ALTER TABLE public.contracts ALTER COLUMN payment_day SET DEFAULT 5;