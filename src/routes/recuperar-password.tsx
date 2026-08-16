import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/recuperar-password")({
  head: () => ({
    meta: [
      { title: "Recuperar password — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Perdeu o acesso? Receba um link seguro por e-mail para definir uma nova password no Carta MZ Quiz.",
      },
      { property: "og:title", content: "Recuperar password — Carta MZ Quiz" },
      { property: "og:description", content: "Enviamos um link seguro para redefinir a sua password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecuperarPassword,
});

function RecuperarPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) {
      toast.error("Escreva um e-mail válido.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-password`,
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível enviar o link. Tente mais tarde.");
      return;
    }
    setSent(true);
    toast.success("Link de recuperação enviado!");
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-3xl font-semibold">Recuperar password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escreva o e-mail da sua conta e enviamos um link seguro para definir uma nova password.
        </p>

        {sent ? (
          <div className="surface mt-6 rounded-3xl p-6 text-center">
            <MailCheck className="mx-auto h-10 w-10 text-primary" />
            <p className="mt-4 text-sm font-semibold">Verifique o seu e-mail</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Enviámos o link para <strong>{email}</strong>. O link é válido por pouco tempo.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-4 text-sm font-semibold text-primary"
            >
              Enviar novamente
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="surface mt-6 space-y-4 rounded-3xl p-6">
            <label className="block text-sm font-semibold">
              E-mail
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-normal"
                autoComplete="email"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar link de recuperação
            </button>
            <Link to="/auth" className="block text-center text-sm font-semibold text-primary">
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </AppShell>
  );
}
