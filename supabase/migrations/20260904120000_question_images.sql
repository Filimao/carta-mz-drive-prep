-- ============================================================
-- Imagens associadas às questões importadas dos PDFs
-- ============================================================

ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS image_region JSONB;

COMMENT ON COLUMN public.questions.image_url
IS 'URL da imagem/figura recortada especificamente para esta questão.';

COMMENT ON COLUMN public.questions.image_region
IS 'Região relativa da imagem da questão dentro da página original do PDF.';

-- Índice opcional para facilitar consultas de questões com imagem
CREATE INDEX IF NOT EXISTS idx_questions_image_url
ON public.questions (image_url)
WHERE image_url IS NOT NULL;
