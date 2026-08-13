import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Crown, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, PLAN_ORDER, type PlanTier } from "@/lib/plans";

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Planos e preços — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Escolha o plano ideal: Free para começar, Pro por 97 MT e Premium por 180 MT com estudo offline e estatísticas avançadas.",
      },
      { property: "og:title", content: "Planos e preços — Carta MZ Quiz" },
      {
        property: "og:description",
        content: "Free, Pro (97 MT) e Premium (180 MT) para preparar o exame teórico em Moçambique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Precos,
});

function Precos() {
  const session = useSession();
  const [pending, setPending] = useState<PlanTier | null>(null);
  const [reference, setReference] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(tier: PlanTier) {
    if (!session.userId) return;
    setSending(true);
    const { error } = await supabase.from("subscription_requests").insert({
      user_id: session.userId,
      plan: tier,
      amount_mzn: PLANS[tier].priceMzn,
      payment_method: "mpesa",
      payment_reference: reference || null,
      status: "pendente",
    });
    setSending(false);
    if (error) {
      toast.error("Não foi possível enviar o pedido.");
      return;
    }
    setPending(null);
    setReference("");
    toast.success("Pedido enviado! Vamos activar o plano após confirmar o pagamento.");
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-semibold">Planos e preços</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Comece grátis. Quando estiver pronto para estudar a sério, active o Pro ou o Premium por
        M-Pesa, e-Mola ou transferência.
      </p>
      {!session.loading && session.userId && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-1.5 text-xs font-semibold">
          <Crown className="h-3.5 w-3.5 text-primary" /> Plano actual: {session.plan.name}
        </p>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((tier) => {
          const plan = PLANS[tier];
          const active = session.plan.tier === tier && session.userId != null;
          return (
            <div
              key={tier}
              className={`surface flex flex-col rounded-3xl p-6 ${
                tier === "pro" ? "border-primary ring-1 ring-primary/40" : ""
              }`}
            >
              {tier === "pro" && (
                <span className="mb-3 self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  Mais popular
                </span>
              )}
              <h2 className="font-display text-xl font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              <p className="mt-4 font-display text-3xl font-bold">
                {plan.priceMzn === 0 ? "0 MT" : `${plan.priceMzn} MT`}
                <span className="ml-1 text-sm font-medium text-muted-foreground">{plan.period}</span>
              </p>

              <ul className="mt-5 space-y-2 text-sm">
                {plan.benefits.map((b) => (
                  <li key={b} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
                {plan.limits.map((l) => (
                  <li key={l} className="flex gap-2 text-muted-foreground">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {tier === "free" ? (
                  <Link
                    to="/praticar"
                    className="block w-full rounded-xl border border-border px-4 py-2.5 text-center text-sm font-semibold"
                  >
                    Praticar grátis
                  </Link>
                ) : active ? (
                  <span className="block w-full rounded-xl bg-secondary px-4 py-2.5 text-center text-sm font-semibold">
                    Plano activo
                  </span>
                ) : session.userId ? (
                  <button
                    type="button"
                    onClick={() => setPending(tier)}
                    className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    Quero o {plan.name}
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    className="block w-full rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
                  >
                    Entrar para subscrever
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pending && (
        <div className="surface mt-8 max-w-xl rounded-3xl p-6">
          <h2 className="font-display text-lg font-semibold">
            Activar {PLANS[pending].name} — {PLANS[pending].priceMzn} MT
          </h2>
          <ol className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>1. Envie {PLANS[pending].priceMzn} MT por M-Pesa ou e-Mola para 84 000 0000.</li>
            <li>2. Introduza abaixo a referência da mensagem de confirmação.</li>
            <li>3. Activamos o plano depois de confirmar o pagamento.</li>
          </ol>
          <label className="mt-4 block text-sm font-semibold">
            Referência do pagamento
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex.: PP240813.1234.A56789"
              className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={sending}
              onClick={() => void submit(pending)}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {sending ? "A enviar..." : "Enviar pedido"}
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
