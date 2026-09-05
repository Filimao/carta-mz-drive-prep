-- Uploads use `upsert: true` so a page can be reprocessed without losing its
-- associated image. Storage requires a separate UPDATE policy for that case.
CREATE POLICY "admins update question images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'question-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'question-images' AND public.has_role(auth.uid(), 'admin'));
