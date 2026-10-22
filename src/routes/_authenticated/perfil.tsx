import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ExpiredBanner, PlanBadge } from "@/components/PlanGate";
import { usePlano } from "@/hooks/usePlano";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { SUPPORT_WHATSAPP } from "@/lib/plan-access";
import { PLANS } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "A minha conta — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Veja os seus dados, o plano activo, a data de expiração e gerencie a sua conta no Carta MZ Quiz.",
      },
      { property: "og:title", content: "A minha conta — Carta MZ Quiz" },
      { property: "og:description", content: "Dados pessoais, plano e segurança da conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Perfil,
});

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function Perfil() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const plano = usePlano();
  const [confirmStep, setConfirmStep] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["perfil"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,phone,plan,plan_expires_at")
        .eq("id", user.id)
        .maybeSingle();
      return { email: user.email ?? "", profile };
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  async function changePassword() {
    if (!data?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/redefinir-password`,
    });
    if (error) {
      toast.error("Não foi possível enviar o link.");
      return;
    }
    toast.success("Enviámos um link para alterar a password.");
  }

  async function removeAccount() {
    setDeleting(true);
    try {
      await deleteMyAccount();
      queryClient.clear();
      await supabase.auth.signOut();
      toast.success("Conta eliminada.");
      void navigate({ to: "/", replace: true });
    } catch {
      toast.error("Não foi possível eliminar a conta. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading || plano.loading) {
    return (
      <AppShell>
        <div className="surface mx-auto max-w-xl animate-pulse rounded-3xl p-8">
          <div className="h-6 w-40 rounded bg-muted" />
          <div className="mt-4 h-4 w-64 rounded bg-muted" />
          <div className="mt-3 h-4 w-52 rounded bg-muted" />
        </div>
      </AppShell>
    );
  }

  const tier = plano.status.subscriptionTier;
  const planName = PLANS[tier].name;

  return (
    <AppShell>
      <div className="mx-auto max-w-xl">
        {plano.status.expired && !plano.status.launchAccess && <ExpiredBanner />}
        <h1 className="font-display text-3xl font-semibold">A minha conta</h1>

        <div className="surface mt-6 space-y-4 rounded-3xl p-6">
          <div className="flex flex-wrap items-center gap-2">
            <PlanBadge
              tier={tier}
              label={
                plano.status.launchAccess
                  ? "Acesso total gratuito"
                  : `Plano ${planName}`
              }
            />
            {plano.status.paymentPending && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <Clock className="h-3 w-3" /> Pagamento em análise
              </span>
            )}
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">Nome</dt>
              <dd className="font-semibold">{data?.profile?.full_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">E-mail</dt>
              <dd className="font-semibold break-all">{data?.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">Telefone</dt>
              <dd className="font-semibold">{data?.profile?.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">Expira em</dt>
              <dd className="font-semibold">
                {plano.status.launchAccess
                  ? "Acesso gratuito durante a fase de lançamento"
                  : formatDate(plano.status.expiresAt)}
              </dd>
            </div>
          </dl>

          {tier === "free" && !plano.status.launchAccess && (
            <Link
              to="/precos"
              className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Fazer upgrade
            </Link>
          )}
          {tier === "premium" && (
            <a
              href={SUPPORT_WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold"
            >
              <ShieldCheck className="h-4 w-4" /> Apoio prioritário (WhatsApp)
            </a>
          )}
        </div>

        <div className="surface mt-5 space-y-3 rounded-3xl p-6">
          <h2 className="font-display text-lg font-semibold">Segurança</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void changePassword()}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold"
            >
              Alterar password
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold"
            >
              <LogOut className="h-4 w-4" /> Terminar sessão
            </button>
          </div>

          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-semibold">Eliminar conta</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Esta acção é irreversível: perde o progresso, XP e badges.
            </p>
            {confirmStep === 0 && (
              <button
                type="button"
                onClick={() => setConfirmStep(1)}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-destructive/50 px-4 py-2 text-sm font-semibold text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Eliminar conta
              </button>
            )}
            {confirmStep === 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmStep(2)}
                  className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
                >
                  Tenho a certeza
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmStep(0)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
                >
                  Cancelar
                </button>
              </div>
            )}
            {confirmStep === 2 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void removeAccount()}
                  className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
                >
                  {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar eliminação definitiva
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmStep(0)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
