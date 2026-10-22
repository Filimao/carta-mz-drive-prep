CREATE TABLE public.product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL CHECK (event_name IN (
    'landing_page_view',
    'try_free_click',
    'mini_test_start',
    'mini_test_complete',
    'create_account_click',
    'registration_complete',
    'login_complete',
    'practice_start',
    'simulation_start',
    'offline_pack_download',
    'plan_conversion_intent',
    'plan_conversion'
  )),
  source_path TEXT NOT NULL CHECK (char_length(source_path) <= 256),
  plan TEXT CHECK (plan IS NULL OR plan IN ('free', 'pro', 'premium')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_events FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.product_events TO anon, authenticated;
GRANT SELECT ON public.product_events TO authenticated;

CREATE POLICY "product events insert own identity"
  ON public.product_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NOT DISTINCT FROM auth.uid());

CREATE POLICY "product events admin read"
  ON public.product_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX product_events_created_at_idx ON public.product_events(created_at DESC);
CREATE INDEX product_events_name_created_at_idx ON public.product_events(event_name, created_at DESC);
