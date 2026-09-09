import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { planOf, type PlanDefinition } from "@/lib/plans";

export interface SessionInfo {
  loading: boolean;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  isAdmin: boolean;
  plan: PlanDefinition;
  planExpiresAt: string | null;
}

const INITIAL: SessionInfo = {
  loading: true,
  userId: null,
  email: null,
  fullName: null,
  isAdmin: false,
  plan: planOf("free"),
  planExpiresAt: null,
};

export function useSession(): SessionInfo {
  const [info, setInfo] = useState<SessionInfo>(INITIAL);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!active) return;
      if (!user) {
        setInfo({ ...INITIAL, loading: false });
        return;
      }
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("full_name,plan,plan_expires_at").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (!active) return;
      console.log("[useSession roles]", {
        userId: user.id,
        email: user.email,
        roles: (rolesRes.data ?? []).map((r) => r.role),
        rolesError: rolesRes.error?.message,
      });
      const expired =
        profileRes.data?.plan_expires_at != null &&
        new Date(profileRes.data.plan_expires_at).getTime() < Date.now();
      setInfo({
        loading: false,
        userId: user.id,
        email: user.email ?? null,
        fullName: profileRes.data?.full_name ?? null,
        isAdmin: (rolesRes.data ?? []).some((r) => r.role === "admin"),
        plan: planOf(expired ? "free" : profileRes.data?.plan),
        planExpiresAt: profileRes.data?.plan_expires_at ?? null,
      });
    }

    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void load();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return info;
}
