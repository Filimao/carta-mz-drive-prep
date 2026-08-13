import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — Carta Fácil MZ" },
      {
        name: "description",
        content:
          "Crie a sua conta para guardar o progresso, XP, badges e histórico de simulados em qualquer dispositivo.",
      },
      { property: "og:title", content: "Entrar ou criar conta — Carta Fácil MZ" },
      {
        property: "og:description",
        content: "Sincronize o seu estudo entre telemóvel, tablet e computador.",
      },
    ],
  }),
  component: Auth,
});

const schema = z.object({
  email: z.string().email("Introduza um email válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  name: z.string().optional(),
});

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: form.name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Já pode começar a estudar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
      void navigate({ to: "/progresso" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível concluir.");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com Google.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/progresso" });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-3xl font-semibold">
          {mode === "login" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pode praticar sem conta. Ao criar conta, o seu progresso passa a ser guardado.
        </p>

        <form onSubmit={submit} className="surface mt-6 space-y-4 rounded-3xl p-6">
          {mode === "register" && (
            <label className="block text-sm font-semibold">
              Nome
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-normal"
                autoComplete="name"
              />
            </label>
          )}
          <label className="block text-sm font-semibold">
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-normal"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm font-semibold">
            Senha
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-normal"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading ? "A processar..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
          <button
            type="button"
            onClick={() => void google()}
            className="w-full rounded-xl border border-border px-5 py-3 text-sm font-semibold"
          >
            Continuar com Google
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="w-full text-sm font-semibold text-primary"
          >
            {mode === "login" ? "Ainda não tenho conta" : "Já tenho conta"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
