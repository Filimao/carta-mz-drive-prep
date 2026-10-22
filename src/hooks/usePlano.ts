import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { fetchPlanStatus, GUEST_STATUS, type PlanStatus } from "@/lib/plan-access";

export interface UsePlano {
  loading: boolean;
  status: PlanStatus;
  /** Plano pago activo (Pro ou Premium não expirado). */
  isPago: boolean;
  estado: "activo" | "expirado" | "pendente" | "free";
  refresh: () => void;
}

/**
 * Plano do utilizador lido do servidor (`my_plan_status`), por isso não pode ser
 * falsificado no browser. Disponível em toda a aplicação via TanStack Query.
 */
export function usePlano(): UsePlano {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["plan-status"],
    queryFn: fetchPlanStatus,
    staleTime: 30_000,
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void queryClient.invalidateQueries({ queryKey: ["plan-status"] });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const status = query.data ?? GUEST_STATUS;
  const estado: UsePlano["estado"] = status.expired
    ? "expirado"
    : status.launchAccess
      ? "activo"
    : status.paymentPending && status.tier === "free"
      ? "pendente"
      : status.tier === "free"
        ? "free"
        : "activo";

  return {
    loading: query.isLoading,
    status,
    isPago: status.subscriptionTier !== "free" && !status.expired,
    estado,
    refresh: () => void queryClient.invalidateQueries({ queryKey: ["plan-status"] }),
  };
}
