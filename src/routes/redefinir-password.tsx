import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/redefinir-password")({
  head: () => ({
    meta: [
      { title: "Redefinir password — Carta MZ Quiz" },
      {
        name: "description",
        content: "Defina uma nova password para voltar a estudar para o exame teórico no Carta MZ Quiz.",
      },
      { property: "og:title", content: "Redefinir password — Carta MZ Quiz" },
      { property: "og:description", content: "Recupere o acesso à sua conta em poucos segundos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RedefinirPassword,
});

function problem(value: string) {
  if (value.length < 8) return "A password precisa de pelo menos 8 caracteres.";
  if (!/\d/.test(value)) return "A password precisa de pelo menos 1 número.";
  return null;
}

function RedefinirPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setReady(data.session != null));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => void navigate({ to: "/auth" }), 3000);
    return () => clearTimeout(t);
  }, [done, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const bad = problem(password);
    if (bad) {
      toast.error(bad);
      return;
    }
    if (password !== confirm) {
      toast.error("As passwords não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("O link pode ter expirado. Peça um novo link de recuperação.");
      return;
    }
    setDone(true);
    toast.success("Password redefinida com sucesso!");
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-normal";

  if (done) {
    return (
      <AppShell>
        <div className="surface mx-auto max-w-md rounded-3xl p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Password redefinida!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vamos levar-te ao login em 3 segundos. Continua assim!
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-3xl font-semibold">Redefinir password</h1>
        {ready === null && (
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> A validar o link...
          </p>
        )}
        {ready === false && (
          <div className="surface mt-6 rounded-3xl p-6 text-center">
            <p className="text-sm font-semibold">Este link já expirou ou é inválido.</p>
            <Link
              to="/recuperar-password"
              className="mt-4 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Solicitar novo link
            </Link>
          </div>
        )}
        {ready === true && (
          <form onSubmit={submit} className="surface mt-6 space-y-4 rounded-3xl p-6">
            <label className="block text-sm font-semibold">
              Nova password
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-semibold">
              Confirmar nova password
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Redefinir
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
