
CREATE POLICY "ocr own folder read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ocr-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "ocr own folder insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ocr-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "ocr own folder update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ocr-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "ocr own folder delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ocr-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "source docs read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'source-documents');
CREATE POLICY "source docs admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'source-documents' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "source docs admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'source-documents' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "source docs admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'source-documents' AND public.has_role(auth.uid(),'admin'));
