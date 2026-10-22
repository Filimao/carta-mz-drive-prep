import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, type PlanTier } from "@/lib/plans";
import { trackProductEvent } from "@/lib/product-analytics";

export const Route = createFileRoute("/_authenticated/admin/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos pendentes — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Área de administração para confirmar pagamentos M-Pesa e e-Mola e activar planos Pro ou Premium por 30 dias.",
      },
      { property: "og:title", content: "Pagamentos pendentes — Carta MZ Quiz" },
      { property: "og:description", content: "Aprovar ou rejeitar pedidos de subscrição." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pagamentos,
});

interface RequestRow {
  id: string;
  user_id: string;
  plan: PlanTier;
  amount_mzn: number;
  payment_method: string;
  payment_reference: string | null;
  payer_phone: string | null;
  proof_url: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

function Pagamentos() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pendente" | "aprovado" | "rejeitado">("pendente");
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-pagamentos", filter],
    enabled: session.isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_requests")
        .select(
          "id,user_id,plan,amount_mzn,payment_method,payment_reference,payer_phone,proof_url,status,rejection_reason,created_at",
        )
        .eq("status", filter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RequestRow[];
    },
  });

  async function approve(id: string, plan: PlanTier) {
    setBusy(id);
    const { error } = await supabase.rpc("approve_subscription_request", { _id: id });
    setBusy(null);
    if (error) {
      toast.error("Não foi possível aprovar o pedido.");
      return;
    }
    trackProductEvent("plan_conversion", plan);
    toast.success("Plano activado por 30 dias!");
    void queryClient.invalidateQueries({ queryKey: ["admin-pagamentos"] });
  }

  async function reject(id: string) {
    const motivo = (reason[id] ?? "").trim();
    if (!motivo) {
      toast.error("Escreva o motivo da rejeição.");
      return;
    }
    setBusy(id);
    const { error } = await supabase.rpc("reject_subscription_request", {
      _id: id,
      _reason: motivo,
    });
    setBusy(null);
    if (error) {
      toast.error("Não foi possível rejeitar o pedido.");
      return;
    }
    toast.success("Pedido rejeitado e utilizador notificado.");
    void queryClient.invalidateQueries({ queryKey: ["admin-pagamentos"] });
  }

  async function openProof(path: string) {
    const { data, error } = await supabase.storage.from("comprovativos").createSignedUrl(path, 300);
    if (error || !data) {
      toast.error("Não foi possível abrir o comprovativo.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  if (session.loading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">A verificar permissões...</p>
      </AppShell>
    );
  }

  if (!session.isAdmin) {
    return (
      <AppShell>
        <div className="surface mx-auto max-w-md rounded-3xl p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta área é exclusiva para administradores da plataforma.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Voltar ao início
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Pagamentos</h1>
        <Link to="/admin" className="text-sm font-semibold text-primary">
          Ir para questões
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Confirme o valor recebido por M-Pesa ou e-Mola e active o plano por 30 dias.
      </p>

      <div className="mt-5 flex gap-2">
        {(["pendente", "aprovado", "rejeitado"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold capitalize ${
              filter === s ? "border-primary bg-primary/10 text-primary" : "border-border"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface h-28 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Sem pedidos {filter}s.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {(data ?? []).map((r) => (
            <li key={r.id} className="surface rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-lg font-semibold">
                  {PLANS[r.plan]?.name ?? r.plan} — {r.amount_mzn} MT
                </p>
                <span className="text-xs font-semibold text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("pt-PT")}
                </span>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">Método</dt>
                  <dd className="font-semibold uppercase">{r.payment_method}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">Número usado</dt>
                  <dd className="font-semibold">{r.payer_phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">Referência</dt>
                  <dd className="font-semibold break-all">{r.payment_reference ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">Utilizador</dt>
                  <dd className="font-mono text-xs break-all">{r.user_id}</dd>
                </div>
              </dl>

              {r.proof_url && (
                <button
                  type="button"
                  onClick={() => void openProof(r.proof_url as string)}
                  className="mt-3 text-sm font-semibold text-primary underline"
                >
                  Ver comprovativo
                </button>
              )}

              {r.status === "rejeitado" && r.rejection_reason && (
                <p className="mt-3 text-xs text-muted-foreground">Motivo: {r.rejection_reason}</p>
              )}

              {r.status === "pendente" && (
                <div className="mt-4 space-y-3">
                  <input
                    value={reason[r.id] ?? ""}
                    onChange={(e) => setReason((s) => ({ ...s, [r.id]: e.target.value }))}
                    placeholder="Motivo (necessário para rejeitar)"
                    className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => void approve(r.id, r.plan)}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {busy === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Aprovar (30 dias)
                    </button>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => void reject(r.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-destructive/50 px-5 py-2.5 text-sm font-semibold text-destructive disabled:opacity-60"
                    >
                      <X className="h-4 w-4" /> Rejeitar
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
