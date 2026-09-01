REVOKE ALL ON FUNCTION public.my_plan_status() FROM anon;
REVOKE ALL ON FUNCTION public.my_plan_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_plan_status() TO authenticated;