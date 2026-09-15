CREATE TABLE public.symbols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_prompt TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.symbols TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.symbols TO authenticated;
GRANT ALL ON public.symbols TO service_role;
ALTER TABLE public.symbols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "symbols public read" ON public.symbols FOR SELECT USING (true);
CREATE POLICY "symbols admin write" ON public.symbols FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX symbols_category_idx ON public.symbols(category_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER symbols_updated BEFORE UPDATE ON public.symbols FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
