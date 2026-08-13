-- 1) Plan tier on profiles
DO $$ BEGIN
  CREATE TYPE public.plan_tier AS ENUM ('free','pro','premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan public.plan_tier NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- 2) Admin emails (internal only, no Data API grants)
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.admin_emails TO service_role;
INSERT INTO public.admin_emails (email) VALUES ('filimafelix10@gmail.com') ON CONFLICT DO NOTHING;

-- 3) Grant admin now if the account already exists
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role FROM auth.users u
WHERE lower(u.email) IN (SELECT lower(email) FROM public.admin_emails)
ON CONFLICT DO NOTHING;

-- 4) New signups with an admin email become admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  IF NEW.email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.admin_emails a WHERE lower(a.email) = lower(NEW.email)
  ) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $function$;

-- 5) Admins can manage roles
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- 6) Subscription requests
CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.plan_tier NOT NULL,
  amount_mzn integer NOT NULL,
  payment_method text NOT NULL DEFAULT 'mpesa',
  payment_reference text,
  status text NOT NULL DEFAULT 'pendente',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_requests TO authenticated;
GRANT ALL ON public.subscription_requests TO service_role;
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own subscription requests read" ON public.subscription_requests;
CREATE POLICY "own subscription requests read" ON public.subscription_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "own subscription requests insert" ON public.subscription_requests;
CREATE POLICY "own subscription requests insert" ON public.subscription_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pendente');

DROP POLICY IF EXISTS "admins update subscription requests" ON public.subscription_requests;
CREATE POLICY "admins update subscription requests" ON public.subscription_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS subscription_requests_updated ON public.subscription_requests;
CREATE TRIGGER subscription_requests_updated BEFORE UPDATE ON public.subscription_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7) Admins can manage plans on profiles
DROP POLICY IF EXISTS "admins manage profiles" ON public.profiles;
CREATE POLICY "admins manage profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));