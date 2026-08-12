CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.question_source AS ENUM ('PDF','AUTHORED');
CREATE TYPE public.difficulty_level AS ENUM ('facil','medio','dificil');
CREATE TYPE public.review_state AS ENUM ('nova','aprendendo','revisao','dominada');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_study_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'TrafficCone',
  emoji TEXT NOT NULL DEFAULT '🚦',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  explanation TEXT NOT NULL DEFAULT '',
  tip TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  difficulty public.difficulty_level NOT NULL DEFAULT 'medio',
  source public.question_source NOT NULL DEFAULT 'AUTHORED',
  source_document TEXT,
  source_page INTEGER,
  image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  needs_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions public read" ON public.questions FOR SELECT USING (is_published = true);
CREATE POLICY "questions admin read" ON public.questions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "questions admin write" ON public.questions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX questions_category_idx ON public.questions(category_id);
CREATE INDEX questions_difficulty_idx ON public.questions(difficulty);
CREATE INDEX questions_source_idx ON public.questions(source);
CREATE INDEX questions_created_idx ON public.questions(created_at);

CREATE TABLE public.quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'pratica',
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  score_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  seconds_spent INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_sessions TO authenticated;
GRANT ALL ON public.quiz_sessions TO service_role;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.quiz_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX quiz_sessions_user_idx ON public.quiz_sessions(user_id, created_at);

CREATE TABLE public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_answer CHAR(1),
  is_correct BOOLEAN NOT NULL DEFAULT false,
  seconds_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_answers TO authenticated;
GRANT ALL ON public.quiz_answers TO service_role;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own answers" ON public.quiz_answers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX quiz_answers_user_idx ON public.quiz_answers(user_id, question_id);

CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  state public.review_state NOT NULL DEFAULT 'nova',
  correct_streak INTEGER NOT NULL DEFAULT 0,
  times_wrong INTEGER NOT NULL DEFAULT 0,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_queue TO authenticated;
GRANT ALL ON public.review_queue TO service_role;
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own review queue" ON public.review_queue FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🏆',
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.badges TO anon;
GRANT SELECT ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges public read" ON public.badges FOR SELECT USING (true);

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  badge_code TEXT NOT NULL REFERENCES public.badges(code) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own badges" ON public.user_badges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER questions_updated BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.categories (slug, name, description, icon, emoji, sort_order) VALUES
('sinais-de-transito','Sinais de trânsito','Sinais de perigo, proibição, obrigação e informação.','TrafficCone','🚦',1),
('regras-de-transito','Regras de trânsito','Normas gerais de circulação nas vias públicas.','BookOpen','🚗',2),
('prioridade','Prioridade e cedência de passagem','Quem passa primeiro em cruzamentos e rotundas.','GitFork','↔️',3),
('ultrapassagem','Ultrapassagem','Quando e como ultrapassar em segurança.','ArrowRightLeft','🔀',4),
('paragem-estacionamento','Paragem e estacionamento','Onde é permitido parar e estacionar.','CircleParking','🅿️',5),
('velocidade','Velocidade','Limites de velocidade e adequação da marcha.','Gauge','🛣️',6),
('distancia-seguranca','Distância de segurança','Intervalos seguros e tempo de reação.','Ruler','📏',7),
('conducao-defensiva','Condução defensiva','Antecipar riscos e evitar acidentes.','ShieldCheck','🛡️',8),
('alcool','Álcool e condução','Efeitos do álcool e limites legais.','Wine','🍺',9),
('fadiga','Fadiga e sono','Cansaço ao volante e pausas.','BedDouble','😴',10),
('comportamento','Stress e comportamento','Emoções, cortesia e agressividade no trânsito.','Smile','🧠',11),
('seguranca-rodoviaria','Segurança rodoviária','Cinto, capacete, airbag e crianças.','LifeBuoy','⚠️',12),
('conducao-noturna','Iluminação e condução noturna','Uso das luzes e condução de noite.','Moon','🌙',13),
('aquaplanagem','Aquaplanagem','Perda de aderência com água na via.','Droplets','💧',14),
('meteorologia','Condições meteorológicas','Chuva, nevoeiro, vento e calor.','CloudRain','🌧️',15),
('peoes-velocipedes','Peões e velocípedes','Utilizadores vulneráveis da via.','Footprints','🚶',16),
('veiculos-pesados','Veículos pesados','Circulação e riscos junto a pesados.','Truck','🚛',17),
('acidentes-emergencia','Acidentes e emergência','Primeiros socorros e sinalização do local.','Siren','🚑',18),
('mecanica','Mecânica básica','Pneus, travões, óleo e manutenção.','Wrench','🔧',19),
('categorias-carta','Categorias de carta de condução','Que veículos cada categoria permite conduzir.','IdCard','🪪',20),
('contraordenacoes','Contraordenações e infrações','Infrações, multas e consequências.','Scale','⚖️',21),
('zonas-urbanas','Condução em zonas urbanas','Trânsito dentro das localidades.','Building2','🏙️',22),
('fora-localidades','Condução fora das localidades','Estradas nacionais e regionais.','Mountain','🌄',23),
('autoestradas','Autoestradas e vias rápidas','Circulação em vias de trânsito rápido.','Milestone','🛤️',24);

INSERT INTO public.badges (code, name, description, emoji, sort_order) VALUES
('first_quiz','Primeiro Quiz','Concluiu o seu primeiro quiz.','🏁',1),
('questions_100','100 Questões','Respondeu a 100 questões.','💯',2),
('exams_10','10 Simulados','Concluiu 10 simulados.','📝',3),
('streak_7','7 Dias Consecutivos','Estudou 7 dias seguidos.','🔥',4),
('score_90','90% de Aproveitamento','Obteve 90% ou mais num quiz.','🎯',5),
('signs_master','Mestre dos Sinais','Dominou a categoria Sinais de trânsito.','🚦',6),
('night_owl','Coruja da Estrada','Estudou depois da meia-noite.','🌙',7),
('perfect_run','Pontuação Perfeita','Acertou todas as questões de um quiz.','⭐',8),
('exam_pass','Aprovado no Simulado','Passou um simulado com 80% ou mais.','✅',9),
('reviewer','Revisor Dedicado','Reviu 50 questões erradas.','🔁',10);