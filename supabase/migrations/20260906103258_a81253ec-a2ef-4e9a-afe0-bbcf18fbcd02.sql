CREATE POLICY "Staff can read lead documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lead-documents'
  AND (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Staff can write lead documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lead-documents'
  AND (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Staff can delete lead documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'lead-documents'
  AND (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
);