import { Link } from "@tanstack/react-router";
import { Crown, Lock, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { PLAN_BADGE } from "@/lib/plan-access";
import type { PlanTier } from "@/lib/plans";

export function PlanBadge({ tier, label }: { tier: PlanTier; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${PLAN_BADGE[tier]}`}>
      <Crown className="h-3 w-3" /> {label}
    </span>
  );
}

/** Modal mostrado quando o utilizador atinge um limite do plano. */
export function LimitModal({
  open,
  title = "Atingiste o limite do plano Free hoje",
  message = "Faz upgrade para continuares a praticar sem limites.",
  onClose,
}: {
  open: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="surface w-full max-w-md rounded-3xl p-6 text-center">
        <TriangleAlert className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-4 font-display text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/precos"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Ver planos
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold"
          >
            Continuar amanhã
          </button>
        </div>
      </div>
    </div>
  );
}

/** Ecrã de "upgrade necessário" para páginas de plano pago. */
export function UpgradeRequired({
  feature,
  plan,
  children,
}: {
  feature: string;
  plan: "Pro" | "Premium";
  children?: ReactNode;
}) {
  return (
    <div className="surface mx-auto max-w-lg rounded-3xl p-8 text-center">
      <Lock className="mx-auto h-10 w-10 text-primary" />
      <h1 className="mt-4 font-display text-2xl font-semibold">{feature} é do plano {plan}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Faz upgrade para desbloquear esta função e continuar a evoluir. Vamos lá!
      </p>
      {children}
      <Link
        to="/precos"
        className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Ver planos
      </Link>
    </div>
  );
}

export function ExpiredBanner() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
      <p className="text-sm font-semibold">
        A tua subscrição expirou. Renova para continuares com acesso completo.
      </p>
      <Link
        to="/precos"
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Renovar
      </Link>
    </div>
  );
}
