ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plano plan_tier NOT NULL DEFAULT 'free',
  data_inicio timestamptz NOT NULL DEFAULT now(),
  data_expiracao timestamptz,
  estado text NOT NULL DEFAULT 'activo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscriptions read" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions(user_id);

CREATE TABLE IF NOT EXISTS public.daily_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Maputo')::date,
  sessions_started integer NOT NULL DEFAULT 0,
  questions_answered integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);
GRANT SELECT ON public.daily_usage TO authenticated;
GRANT ALL ON public.daily_usage TO service_role;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily usage read" ON public.daily_usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER daily_usage_updated BEFORE UPDATE ON public.daily_usage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS payer_phone text;
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS proof_url text;
ALTER TABLE public.subscription_requests ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE OR REPLACE FUNCTION public.effective_plan(_user_id uuid)
RETURNS plan_tier
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.plan = 'free' THEN 'free'::plan_tier
    WHEN p.plan_expires_at IS NOT NULL AND p.plan_expires_at < now() THEN 'free'::plan_tier
    ELSE p.plan
  END
  FROM public.profiles p WHERE p.id = _user_id
$$;
GRANT EXECUTE ON FUNCTION public.effective_plan(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_study_session(_mode text, _requested integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  tier plan_tier;
  max_q integer;
  daily_limit integer;
  used integer;
  today date := (now() AT TIME ZONE 'Africa/Maputo')::date;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  tier := public.effective_plan(uid);

  IF tier = 'premium' THEN max_q := 100; daily_limit := NULL;
  ELSIF tier = 'pro' THEN max_q := 50; daily_limit := NULL;
  ELSE
    daily_limit := 3;
    IF _mode = 'simulado' THEN max_q := 20; ELSE max_q := 15; END IF;
  END IF;

  INSERT INTO public.daily_usage (user_id, day, sessions_started)
  VALUES (uid, today, 0)
  ON CONFLICT (user_id, day) DO NOTHING;

  SELECT sessions_started INTO used FROM public.daily_usage WHERE user_id = uid AND day = today;

  IF daily_limit IS NOT NULL AND used >= daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'daily_limit', 'plan', tier,
      'max_questions', max_q, 'sessions_used', used, 'sessions_limit', daily_limit
    );
  END IF;

  UPDATE public.daily_usage SET sessions_started = sessions_started + 1
  WHERE user_id = uid AND day = today
  RETURNING sessions_started INTO used;

  RETURN jsonb_build_object(
    'allowed', true, 'plan', tier,
    'max_questions', max_q,
    'granted_questions', LEAST(GREATEST(COALESCE(_requested, max_q), 1), max_q),
    'sessions_used', used, 'sessions_limit', daily_limit
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.start_study_session(text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_plan_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  tier plan_tier;
  today date := (now() AT TIME ZONE 'Africa/Maputo')::date;
  used integer := 0;
  expired boolean := false;
  exp timestamptz;
  pending boolean := false;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('plan', 'free', 'authenticated', false); END IF;
  tier := public.effective_plan(uid);
  SELECT plan_expires_at INTO exp FROM public.profiles WHERE id = uid;
  expired := exp IS NOT NULL AND exp < now();
  SELECT COALESCE(sessions_started, 0) INTO used FROM public.daily_usage WHERE user_id = uid AND day = today;
  SELECT EXISTS(SELECT 1 FROM public.subscription_requests WHERE user_id = uid AND status = 'pendente') INTO pending;
  RETURN jsonb_build_object(
    'authenticated', true, 'plan', tier, 'expires_at', exp, 'expired', expired,
    'sessions_used_today', COALESCE(used, 0), 'payment_pending', pending
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.my_plan_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_subscription_request(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.subscription_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.subscription_requests WHERE id = _id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;

  UPDATE public.subscription_requests
    SET status = 'aprovado', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _id;

  UPDATE public.profiles
    SET plan = r.plan, plan_expires_at = now() + interval '30 days'
  WHERE id = r.user_id;

  UPDATE public.subscriptions SET estado = 'expirado' WHERE user_id = r.user_id AND estado = 'activo';
  INSERT INTO public.subscriptions (user_id, plano, data_inicio, data_expiracao, estado)
  VALUES (r.user_id, r.plan, now(), now() + interval '30 days', 'activo');

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (r.user_id, 'Plano activado!', 'O teu plano ' || r.plan || ' está activo por 30 dias. Bons estudos!');
END; $$;
GRANT EXECUTE ON FUNCTION public.approve_subscription_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_subscription_request(_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.subscription_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.subscription_requests WHERE id = _id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.subscription_requests
    SET status = 'rejeitado', rejection_reason = _reason, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _id;
  INSERT INTO public.notifications (user_id, title, body)
  VALUES (r.user_id, 'Pagamento não confirmado', COALESCE(_reason, 'Não conseguimos confirmar o pagamento. Verifica o comprovativo e tenta novamente.'));
END; $$;
GRANT EXECUTE ON FUNCTION public.reject_subscription_request(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, phone, terms_accepted_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone',
    CASE WHEN NEW.raw_user_meta_data->>'terms_accepted' = 'true' THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plano, estado) VALUES (NEW.id, 'free', 'activo');

  IF NEW.email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.admin_emails a WHERE lower(a.email) = lower(NEW.email)
  ) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

CREATE POLICY "own proofs upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprovativos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own proofs read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprovativos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));