ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS image_region JSONB;

COMMENT ON COLUMN public.questions.image_url IS
'URL da imagem recortada associada especificamente à questão.';

COMMENT ON COLUMN public.questions.image_region IS
'Região da imagem dentro da página original do PDF, em coordenadas relativas 0..1.';


-- =========================================================
-- STORAGE
-- =========================================================

INSERT INTO storage.buckets (
  id,
  name,
  public
)
VALUES (
  'question-images',
  'question-images',
  true
)
ON CONFLICT (id)
DO UPDATE SET public = true;


-- =========================================================
-- POLÍTICA: utilizadores autenticados podem visualizar
-- imagens das questões
-- =========================================================

DROP POLICY IF EXISTS
  "question_images_select_authenticated"
ON storage.objects;

CREATE POLICY
  "question_images_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'question-images'
);


-- =========================================================
-- ADMIN pode fazer upload
-- =========================================================

DROP POLICY IF EXISTS
  "question_images_insert_admin"
ON storage.objects;

CREATE POLICY
  "question_images_insert_admin"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'question-images'
  AND public.has_role(
    auth.uid(),
    'admin'
  )
);


-- =========================================================
-- ADMIN pode atualizar
-- =========================================================

DROP POLICY IF EXISTS
  "question_images_update_admin"
ON storage.objects;

CREATE POLICY
  "question_images_update_admin"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'question-images'
  AND public.has_role(
    auth.uid(),
    'admin'
  )
)
WITH CHECK (
  bucket_id = 'question-images'
  AND public.has_role(
    auth.uid(),
    'admin'
  )
);


-- =========================================================
-- ADMIN pode eliminar
-- =========================================================

DROP POLICY IF EXISTS
  "question_images_delete_admin"
ON storage.objects;

CREATE POLICY
  "question_images_delete_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'question-images'
  AND public.has_role(
    auth.uid(),
    'admin'
  )
);
