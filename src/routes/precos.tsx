import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Crown, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ExpiredBanner, PlanBadge } from "@/components/PlanGate";
import { usePlano } from "@/hooks/usePlano";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { PAYMENT_NUMBERS } from "@/lib/plan-access";
import { PLANS, PLAN_ORDER, type PlanTier } from "@/lib/plans";
import { trackProductEvent } from "@/lib/product-analytics";

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
      { property: "og:image", content: "/icon-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/icon-512.png" },
      { name: "twitter:title", content: "Planos e preços — Carta MZ Quiz" },
      {
        name: "twitter:description",
        content: "Compare Free, Pro e Premium para preparar o exame teórico de condução em Moçambique.",
      },
    ],
  }),
  component: Precos,
});

const PHONE_RE = /^8[4-7]\d{7}$/;

function Precos() {
  const session = useSession();
  const plano = usePlano();
  const [pending, setPending] = useState<PlanTier | null>(null);
  const [method, setMethod] = useState<"mpesa" | "emola">("mpesa");
  const [payerPhone, setPayerPhone] = useState("");
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(tier: PlanTier) {
    if (!session.userId) return;
    if (!PHONE_RE.test(payerPhone)) {
      toast.error("Escreva o número usado para pagar (84/85/86/87 + 7 dígitos).");
      return;
    }
    if (proof && proof.size > 5 * 1024 * 1024) {
      toast.error("O comprovativo deve ter menos de 5 MB.");
      return;
    }
    setSending(true);
    let proofPath: string | null = null;
    if (proof) {
      const ext = proof.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${session.userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("comprovativos").upload(path, proof);
      if (upErr) {
        setSending(false);
        toast.error("Não foi possível enviar o comprovativo.");
        return;
      }
      proofPath = path;
    }

    const { error } = await supabase.from("subscription_requests").insert({
      user_id: session.userId,
      plan: tier,
      amount_mzn: PLANS[tier].priceMzn,
      payment_method: method,
      payer_phone: payerPhone,
      payment_reference: reference.trim() || null,
      proof_url: proofPath,
      status: "pendente",
    });
    setSending(false);
    if (error) {
      toast.error("Não foi possível enviar o pedido.");
      return;
    }
    setPending(null);
    setReference("");
    setPayerPhone("");
    setProof(null);
    plano.refresh();
    toast.success(
      "Recebemos o teu pedido! Vamos confirmar o pagamento e activar o teu plano em breve.",
    );
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-normal";

  return (
    <AppShell>
      {plano.status.expired && <ExpiredBanner />}
      <h1 className="font-display text-3xl font-semibold">Planos e preços</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Comece grátis. Quando estiver pronto para estudar a sério, active o Pro ou o Premium por
        M-Pesa ou e-Mola.
      </p>
      {!session.loading && session.userId && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <PlanBadge tier={plano.status.tier} label={`Plano actual: ${plano.status.plan.name}`} />
          {plano.status.paymentPending && (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              Pagamento em análise
            </span>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((tier) => {
          const plan = PLANS[tier];
          const active = plano.status.tier === tier && session.userId != null && !plano.status.expired;
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
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-center text-sm font-semibold">
                    <Crown className="h-4 w-4 text-primary" /> Plano activo
                  </span>
                ) : session.userId ? (
                  <button
                    type="button"
                    onClick={() => {
                      trackProductEvent("plan_conversion_intent", tier);
                      setPending(tier);
                    }}
                    className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    Quero o {plan.name}
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => trackProductEvent("create_account_click")}
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
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="surface w-full max-w-lg rounded-3xl p-6">
            <h2 className="font-display text-xl font-semibold">
              Activar {PLANS[pending].name} — {PLANS[pending].priceMzn} MT
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Envia o valor exacto para um dos números abaixo e depois submete o comprovativo. A tua
              conta será activada em até algumas horas após confirmação.
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground">M-Pesa</p>
                <p className="font-display text-lg font-bold">{PAYMENT_NUMBERS.mpesa}</p>
              </div>
              <div className="rounded-2xl border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground">e-Mola</p>
                <p className="font-display text-lg font-bold">{PAYMENT_NUMBERS.emola}</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <fieldset>
                <legend className="text-sm font-semibold">Método usado</legend>
                <div className="mt-2 flex gap-2">
                  {(["mpesa", "emola"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                        method === m ? "border-primary bg-primary/10 text-primary" : "border-border"
                      }`}
                    >
                      {m === "mpesa" ? "M-Pesa" : "e-Mola"}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="block text-sm font-semibold">
                Número de telefone usado para pagar
                <input
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  placeholder="84XXXXXXX"
                  inputMode="numeric"
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-semibold">
                Referência / ID da transacção (opcional)
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex.: PP240813.1234.A56789"
                  maxLength={80}
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-semibold">
                Comprovativo (screenshot, recomendado)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                  className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-normal"
                />
              </label>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Os pagamentos são processados manualmente via M-Pesa/e-Mola. Guarda o teu comprovativo
              até a confirmação.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={sending}
                onClick={() => void submit(pending)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar pagamento enviado
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
        </div>
      )}
    </AppShell>
  );
}
