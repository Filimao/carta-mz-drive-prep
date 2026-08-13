import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Definir nova senha — Carta MZ Quiz" },
      {
        name: "description",
        content: "Crie uma nova senha para voltar a acessar o seu progresso no Carta MZ Quiz.",
      },
      { property: "og:title", content: "Definir nova senha — Carta MZ Quiz" },
      { property: "og:description", content: "Recupere o acesso à sua conta em poucos segundos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setReady(data.session != null));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha actualizada!");
    void navigate({ to: "/progresso" });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-3xl font-semibold">Definir nova senha</h1>
        {!ready && (
          <p className="mt-2 text-sm text-muted-foreground">
            Abra esta página a partir do link enviado para o seu email. Se o link expirou, peça um
            novo em “Esqueci a minha senha”.
          </p>
        )}
        <form onSubmit={submit} className="surface mt-6 space-y-4 rounded-3xl p-6">
          <label className="block text-sm font-semibold">
            Nova senha
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            Confirmar senha
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading ? "A guardar..." : "Guardar nova senha"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
