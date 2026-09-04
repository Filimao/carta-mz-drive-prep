INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "public read question images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'question-images');

CREATE POLICY "admins upload question images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete question images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'question-images' AND public.has_role(auth.uid(), 'admin'));
