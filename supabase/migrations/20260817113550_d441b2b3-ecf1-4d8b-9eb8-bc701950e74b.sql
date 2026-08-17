CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.generate_finance_alerts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_inserted int := 0;
  r record;
  v_link text;
  v_title text;
  v_body text;
BEGIN
  -- 1) Contratos a terminar nos próximos 30 dias
  FOR r IN
    SELECT c.id,
           res.full_name,
           (SELECT rm.number
              FROM public.stays s
              LEFT JOIN public.rooms rm ON rm.id = s.room_id
             WHERE s.contract_id = c.id
             ORDER BY s.check_in DESC
             LIMIT 1) AS room_number,
           COALESCE(c.actual_end_date, c.end_date) AS end_date
      FROM public.contracts c
      JOIN public.residents res ON res.id = c.resident_id
     WHERE c.status = 'active'
       AND COALESCE(c.actual_end_date, c.end_date) BETWEEN CURRENT_DATE AND (CURRENT_DATE + 30)
  LOOP
    v_link := '/finance/contracts/' || r.id::text;
    v_title := 'Contrato a terminar: ' || r.full_name ||
               COALESCE(' (quarto ' || r.room_number || ')', '');
    v_body := 'Termina a ' || to_char(r.end_date, 'DD/MM/YYYY') || '.';

    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT ur.user_id, 'contract_ending', v_title, v_body, v_link
      FROM public.user_roles ur
     WHERE ur.role IN ('manager','admin')
       AND NOT EXISTS (
         SELECT 1 FROM public.notifications n
          WHERE n.user_id = ur.user_id
            AND n.type = 'contract_ending'
            AND n.link = v_link
            AND n.created_at >= date_trunc('day', now())
       );
    v_inserted := v_inserted + 1;
  END LOOP;

  -- 2) Rendas em atraso
  FOR r IN
    SELECT rcb.contract_id,
           rcb.year,
           rcb.month,
           rcb.outstanding,
           res.full_name,
           (SELECT rm.number
              FROM public.stays s
              LEFT JOIN public.rooms rm ON rm.id = s.room_id
             WHERE s.contract_id = rcb.contract_id
             ORDER BY s.check_in DESC
             LIMIT 1) AS room_number
      FROM public.rent_charge_balance rcb
      JOIN public.contracts c ON c.id = rcb.contract_id
      JOIN public.residents res ON res.id = c.resident_id
     WHERE rcb.due_date < CURRENT_DATE
       AND COALESCE(rcb.outstanding, 0) > 0
  LOOP
    v_link := '/finance/contracts/' || r.contract_id::text;
    v_title := 'Renda em atraso: ' || r.full_name ||
               COALESCE(' (quarto ' || r.room_number || ')', '') ||
               ' — ' || lpad(r.month::text, 2, '0') || '/' || r.year::text;
    v_body := 'Em falta: ' || to_char(r.outstanding, 'FM999999990.00') || ' EUR.';

    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT ur.user_id, 'rent_overdue', v_title, v_body, v_link
      FROM public.user_roles ur
     WHERE ur.role IN ('manager','admin')
       AND NOT EXISTS (
         SELECT 1 FROM public.notifications n
          WHERE n.user_id = ur.user_id
            AND n.type = 'rent_overdue'
            AND n.link = v_link
            AND n.title = v_title
            AND n.created_at >= date_trunc('day', now())
       );
    v_inserted := v_inserted + 1;
  END LOOP;

  -- 3) Cauções por devolver em contratos terminados
  FOR r IN
    SELECT c.id,
           res.full_name,
           (c.deposit_received - c.deposit_returned) AS held
      FROM public.contracts c
      JOIN public.residents res ON res.id = c.resident_id
     WHERE c.status = 'terminated'
       AND (c.deposit_received - c.deposit_returned) > 0
  LOOP
    v_link := '/finance/contracts/' || r.id::text;
    v_title := 'Caução por devolver: ' || r.full_name || ' — ' ||
               to_char(r.held, 'FM999999990.00') || ' EUR';
    v_body := 'Contrato terminado com caução retida.';

    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT ur.user_id, 'deposit_pending', v_title, v_body, v_link
      FROM public.user_roles ur
     WHERE ur.role IN ('manager','admin')
       AND NOT EXISTS (
         SELECT 1 FROM public.notifications n
          WHERE n.user_id = ur.user_id
            AND n.type = 'deposit_pending'
            AND n.link = v_link
            AND n.created_at >= date_trunc('day', now())
       );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$fn$;

REVOKE ALL ON FUNCTION public.generate_finance_alerts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_finance_alerts() TO service_role;

SELECT cron.unschedule('generate-finance-alerts')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-finance-alerts');

SELECT cron.schedule(
  'generate-finance-alerts',
  '0 7 * * *',
  $$select public.generate_finance_alerts();$$
);