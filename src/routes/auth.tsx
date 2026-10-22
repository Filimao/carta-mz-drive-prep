import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { trackProductEvent } from "@/lib/product-analytics";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Crie a sua conta para guardar o progresso, XP, badges e histórico de simulados em qualquer dispositivo.",
      },
      { property: "og:title", content: "Entrar ou criar conta — Carta MZ Quiz" },
      {
        property: "og:description",
        content: "Sincronize o seu estudo entre telemóvel, tablet e computador.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/icon-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/icon-512.png" },
      { name: "twitter:title", content: "Entrar ou criar conta — Carta MZ Quiz" },
      {
        name: "twitter:description",
        content: "Crie uma conta para guardar o progresso e estudar em qualquer dispositivo.",
      },
    ],
  }),
  component: Auth,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE_RE = /^8[4-7]\d{7}$/;

function passwordProblem(value: string): string | null {
  if (value.length < 8) return "A password precisa de pelo menos 8 caracteres.";
  if (!/\d/.test(value)) return "A password precisa de pelo menos 1 número.";
  return null;
}

const inputClass =
  "mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-normal outline-none focus:border-primary";

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já está registado. Tente entrar.";
  if (m.includes("invalid login credentials")) return "Credenciais inválidas. Verifique e-mail e password.";
  if (m.includes("email not confirmed")) return "Conta não confirmada, verifica o teu e-mail.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiadas tentativas. Aguarde alguns minutos.";
  if (m.includes("password")) return "Password inválida (mínimo 8 caracteres com 1 número).";
  return "Não foi possível concluir. Tente novamente.";
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-destructive">{error}</span> : null}
    </label>
  );
}

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPass, setShowPass] = useState(false);
  const [keepSession, setKeepSession] = useState(true);
  const [terms, setTerms] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });

  const errors = useMemo(() => {
    const e: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      password?: string | null;
      confirm?: string | null;
    } = {};
    e["email"] = !form.email
      ? "Escreva o seu e-mail."
      : EMAIL_RE.test(form.email.trim())
        ? null
        : "E-mail inválido.";
    e["password"] = !form.password ? "Escreva a password." : passwordProblem(form.password);
    if (mode === "register") {
      e["name"] = form.name.trim().length >= 3 ? null : "Escreva o seu nome completo.";
      e["phone"] = PHONE_RE.test(form.phone.replace(/\s/g, ""))
        ? null
        : "Número moçambicano inválido (84/85/86/87 + 7 dígitos).";
      e["confirm"] = form.confirm === form.password ? null : "As passwords não coincidem.";
    }
    return e;
  }, [form, mode]);

  const invalid = Object.values(errors).some(Boolean) || (mode === "register" && !terms);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, password: true, confirm: true });
    if (invalid) {
      if (mode === "register" && !terms) toast.error("Precisa de aceitar os Termos de Uso.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: form.name.trim(),
              phone: form.phone.replace(/\s/g, ""),
              terms_accepted: "true",
            },
          },
        });
        if (error) throw error;
        trackProductEvent("registration_complete");
        toast.success("Conta criada no plano Free! Confirme o e-mail que lhe enviámos. Vamos lá!");
        setMode("login");
      } else {
        if (!keepSession) {
          try {
            window.sessionStorage.setItem("carta-mz-keep-session", "0");
          } catch {
            /* ignore */
          }
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
        toast.success("Bem-vindo de volta! Continua assim!");
        void navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(translateAuthError(err instanceof Error ? err.message : ""));
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
    void navigate({ to: "/" });
  }

  return (
        <AppShell>
      <div className="relative -mx-4 -mt-20 min-h-screen flex items-center justify-center px-4 pt-20">
        {/* Background Image/Overlay */}
        <div className="absolute inset-0 -z-10 bg-[url('https://images.unsplash.com/photo-1454165833767-027ffea9e778?q=80&w=2070')] bg-cover bg-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl font-bold text-white tracking-tight">
              {mode === "login" ? "Bem-vindo de volta" : "Junte-se a nós"}
            </h1>
            <p className="mt-3 text-lg font-medium text-white/70">
              {mode === "login" 
                ? "Entre para continuar a sua jornada rumo à carta." 
                : "Crie a sua conta e acompanhe o seu progresso."}
            </p>
          </div>

          <form onSubmit={submit} className="liquid-glass p-8 space-y-6" noValidate>
            {mode === "register" && (
              <div className="space-y-4">
                <Field label="Nome completo" error={touched["name"] ? errors["name"] : null}>
                  <input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary transition-all"
                    autoComplete="name"
                    maxLength={120}
                  />
                </Field>
                <Field label="Número de telefone" error={touched["phone"] ? errors["phone"] : null}>
                  <input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value.replace(/[^\d]/g, "").slice(0, 9))}
                    onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary transition-all"
                    placeholder="84XXXXXXX"
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                </Field>
              </div>
            )}

            <div className="space-y-4">
              <Field label="E-mail" error={touched["email"] ? errors["email"] : null}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary transition-all"
                  autoComplete="email"
                  maxLength={255}
                />
              </Field>

              <Field label="Password" error={touched["password"] ? errors["password"] : null}>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary transition-all pr-12"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-lg text-white/50 hover:text-white"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            </div>

            {mode === "register" && (
              <Field label="Confirmar password" error={touched["confirm"] ? errors["confirm"] : null}>
                <input
                  type={showPass ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary transition-all"
                  autoComplete="new-password"
                />
              </Field>
            )}

            <div className="flex items-center justify-between">
              {mode === "register" ? (
                <label className="flex items-start gap-2 text-xs font-medium text-white/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-primary"
                  />
                  <span>Aceito os Termos de Uso</span>
                </label>
              ) : (
                <label className="flex items-center gap-2 text-xs font-medium text-white/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepSession}
                    onChange={(e) => setKeepSession(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary"
                  />
                  Manter sessão
                </label>
              )}
              {mode === "login" && (
                <Link to="/recuperar-password" title="Recuperar password" className="text-xs font-bold text-primary hover:underline">
                  Esqueceu a senha?
                </Link>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="liquid-button w-full !py-3.5 text-base flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {mode === "login" ? "Entrar" : "Criar conta"}
              </button>
              
              <button
                type="button"
                onClick={() => void google()}
                className="liquid-button-outline w-full !py-3.5 text-sm"
              >
                Continuar com Google
              </button>
            </div>

            <p className="text-center text-sm font-medium text-white/60">
              {mode === "login" ? "Não tem uma conta?" : "Já tem uma conta?"}
              <button
                type="button"
                onClick={() => {
                  const nextMode = mode === "login" ? "register" : "login";
                  if (nextMode === "register") trackProductEvent("create_account_click");
                  setMode(nextMode);
                  setTouched({});
                }}
                className="ml-2 font-bold text-primary hover:underline"
              >
                {mode === "login" ? "Registe-se" : "Entre aqui"}
              </button>
            </p>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
