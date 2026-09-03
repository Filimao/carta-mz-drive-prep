CREATE TABLE public.question_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  total_pages integer NOT NULL DEFAULT 0,
  processed_pages integer NOT NULL DEFAULT 0,
  failed_pages integer[] NOT NULL DEFAULT '{}',
  questions_found integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_imports TO authenticated;
GRANT ALL ON public.question_imports TO service_role;

ALTER TABLE public.question_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage question imports"
  ON public.question_imports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER question_imports_updated
  BEFORE UPDATE ON public.question_imports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.questions
  ADD COLUMN import_id uuid REFERENCES public.question_imports(id) ON DELETE SET NULL;

CREATE INDEX questions_import_id_idx ON public.questions (import_id);

CREATE POLICY "admins read question pdfs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'question-pdfs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins upload question pdfs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-pdfs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete question pdfs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'question-pdfs' AND public.has_role(auth.uid(), 'admin'));