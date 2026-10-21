GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_invoices, public.cost_invoice_lines, public.cost_invoice_events, public.cost_invoice_alerts, public.cost_categories TO authenticated;
GRANT ALL ON public.cost_invoices, public.cost_invoice_lines, public.cost_invoice_events, public.cost_invoice_alerts, public.cost_categories TO service_role;
GRANT EXECUTE ON FUNCTION public.valid_cost_file_path(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "staff upload cost invoice files" ON storage.objects;
CREATE POLICY "staff upload cost invoice files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'cost-invoices' AND public.is_staff(auth.uid()) AND public.valid_cost_file_path(name));

DROP POLICY IF EXISTS "staff update cost invoice files" ON storage.objects;
CREATE POLICY "staff update cost invoice files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'cost-invoices' AND public.is_staff(auth.uid()))
WITH CHECK (bucket_id = 'cost-invoices' AND public.is_staff(auth.uid()) AND public.valid_cost_file_path(name));