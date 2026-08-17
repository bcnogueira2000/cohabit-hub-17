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

  -- Rendas fora do período atual do contrato (ex.: data de fim encurtada)
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