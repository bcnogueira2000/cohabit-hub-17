
DROP POLICY IF EXISTS "resident upload own documents" ON storage.objects;
CREATE POLICY "resident upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resident-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "resident read own documents" ON storage.objects;
CREATE POLICY "resident read own documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'resident-documents'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_staff(auth.uid()))
);

DROP POLICY IF EXISTS "resident update own documents" ON storage.objects;
CREATE POLICY "resident update own documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'resident-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'resident-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "resident delete own documents" ON storage.objects;
CREATE POLICY "resident delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resident-documents'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_staff(auth.uid()))
);
