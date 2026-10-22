import { redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const PUBLIC_ROUTES = new Set([
  "/",
  "/mini-teste",
  "/auth",
  "/recuperar-password",
  "/redefinir-password",
  "/redefinir-senha",
]);

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname.replace(/\/+$/, "") || "/");
}

export async function requireRouteAuth() {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;
  if (!data.session) throw redirect({ to: "/auth" });

  return { user: data.session.user };
}
