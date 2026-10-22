CREATE TABLE IF NOT EXISTS public.launch_access_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  full_access_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE public.launch_access_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.launch_access_settings TO service_role;

INSERT INTO public.launch_access_settings (singleton, full_access_enabled)
VALUES (true, true)
ON CONFLICT (singleton) DO UPDATE
SET full_access_enabled = EXCLUDED.full_access_enabled,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.effective_plan(_user_id uuid)
RETURNS public.plan_tier
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(
      (SELECT s.full_access_enabled FROM public.launch_access_settings s WHERE s.singleton),
      false
    ) THEN 'premium'::public.plan_tier
    WHEN p.plan = 'free' THEN 'free'::public.plan_tier
    WHEN p.plan_expires_at IS NOT NULL AND p.plan_expires_at < now()
      THEN 'free'::public.plan_tier
    ELSE p.plan
  END
  FROM public.profiles p
  WHERE p.id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.my_plan_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  tier public.plan_tier;
  subscription_tier public.plan_tier;
  today date := (now() AT TIME ZONE 'Africa/Maputo')::date;
  used integer := 0;
  expired boolean := false;
  exp timestamptz;
  pending boolean := false;
  launch_access boolean := false;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('plan', 'free', 'authenticated', false, 'launch_access', false);
  END IF;

  SELECT p.plan, p.plan_expires_at
  INTO subscription_tier, exp
  FROM public.profiles p
  WHERE p.id = uid;

  IF subscription_tier IS NULL THEN
    RETURN jsonb_build_object('plan', 'free', 'authenticated', false, 'launch_access', false);
  END IF;

  SELECT COALESCE(s.full_access_enabled, false)
  INTO launch_access
  FROM public.launch_access_settings s
  WHERE s.singleton;
  launch_access := COALESCE(launch_access, false);

  tier := public.effective_plan(uid);
  expired := NOT launch_access AND exp IS NOT NULL AND exp < now();

  SELECT COALESCE(u.sessions_started, 0)
  INTO used
  FROM public.daily_usage u
  WHERE u.user_id = uid AND u.day = today;

  SELECT EXISTS (
    SELECT 1
    FROM public.subscription_requests r
    WHERE r.user_id = uid AND r.status = 'pendente'
  )
  INTO pending;

  RETURN jsonb_build_object(
    'authenticated', true,
    'plan', tier,
    'subscription_plan', subscription_tier,
    'launch_access', launch_access,
    'expires_at', exp,
    'expired', expired,
    'sessions_used_today', COALESCE(used, 0),
    'payment_pending', pending
  );
END;
$$;

REVOKE ALL ON FUNCTION public.effective_plan(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.effective_plan(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.my_plan_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_plan_status() TO authenticated;
