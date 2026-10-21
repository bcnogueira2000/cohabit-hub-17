CREATE POLICY "admins delete cost invoice files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'cost-invoices' AND public.has_role(auth.uid(), 'admin'));