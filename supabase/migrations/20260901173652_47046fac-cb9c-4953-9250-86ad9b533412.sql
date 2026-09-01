-- 1) Harden protected profile columns with a SECURITY INVOKER trigger.
-- SECURITY INVOKER keeps current_user as the calling role (authenticated/anon),
-- while internal SECURITY DEFINER functions run as the table owner and stay allowed.
CREATE OR REPLACE FUNCTION public.bloquear_colunas_sensiveis_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  privileged boolean;
BEGIN
  privileged := current_user IN ('postgres', 'service_role', 'supabase_admin', 'supabase_auth_admin')
                OR public.has_role(auth.uid(), 'admin');

  IF NOT privileged THEN
    NEW.plan := OLD.plan;
    NEW.plan_expires_at := OLD.plan_expires_at;
    NEW.xp := OLD.xp;
    NEW.streak_days := OLD.streak_days;
    NEW.last_study_date := OLD.last_study_date;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_bloquear_colunas_sensiveis ON public.profiles;
CREATE TRIGGER trg_bloquear_colunas_sensiveis
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_colunas_sensiveis_profiles();

-- 2) Revoke EXECUTE on SECURITY DEFINER functions that clients must never call.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.bloquear_colunas_sensiveis_profiles() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.aprovar_pagamento(uuid, text, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.effective_plan(uuid) FROM anon, authenticated;

-- Admin/user RPCs: no anonymous access; authenticated only (they check roles internally).
REVOKE ALL ON FUNCTION public.approve_subscription_request(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.reject_subscription_request(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.registar_progresso(integer, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.start_study_session(text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

GRANT EXECUTE ON FUNCTION public.approve_subscription_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_subscription_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registar_progresso(integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_study_session(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_plan_status() TO authenticated;

-- 3) Drop redundant public-role policies on subscription_requests
-- (equivalent authenticated-only policies already exist).
DROP POLICY IF EXISTS "Users can insert own request" ON public.subscription_requests;
DROP POLICY IF EXISTS "Users can view own request" ON public.subscription_requests;