-- Fix admin email to the correct address
INSERT INTO public.admin_emails (email)
VALUES ('filimaofelix10@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Promote existing user with this email to admin
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE lower(u.email) = lower('filimaofelix10@gmail.com')
ON CONFLICT DO NOTHING;

-- Allow any authenticated user to read their own roles
DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Keep full admin management for admins
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles"
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
