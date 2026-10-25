CREATE OR REPLACE FUNCTION public.generate_document_expiry_alerts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE v_count int := 0; r record; v_type text; v_link text;
BEGIN
  FOR r IN
    SELECT id, full_name, document_validity, (document_validity - CURRENT_DATE) AS days
      FROM public.residents
     WHERE status <> 'past' AND document_validity IS NOT NULL
       AND document_validity BETWEEN CURRENT_DATE AND CURRENT_DATE + 60
  LOOP
    v_type := CASE WHEN r.days <= 30 THEN 'document_expiring_30' ELSE 'document_expiring_60' END;
    v_link := '/residents/' || r.id::text;
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT DISTINCT ur.user_id, v_type,
           'Documento a caducar: ' || r.full_name,
           'O documento de identificação caduca a ' || to_char(r.document_validity, 'DD/MM/YYYY') || ' (' || r.days || ' dias).',
           v_link
      FROM public.user_roles ur
     WHERE ur.role IN ('staff','manager','admin')
       AND NOT EXISTS (SELECT 1 FROM public.notifications n
                        WHERE n.user_id = ur.user_id AND n.type = v_type AND n.link = v_link
                          AND n.body LIKE '%' || to_char(r.document_validity, 'DD/MM/YYYY') || '%');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $fn$;
REVOKE ALL ON FUNCTION public.generate_document_expiry_alerts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_document_expiry_alerts() TO service_role;
SELECT cron.unschedule('generate-document-expiry-alerts') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-document-expiry-alerts');
SELECT cron.schedule('generate-document-expiry-alerts', '5 7 * * *', $$select public.generate_document_expiry_alerts();$$);