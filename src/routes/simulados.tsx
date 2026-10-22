import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LimitModal } from "@/components/PlanGate";
import { QuizEngine } from "@/components/QuizEngine";
import { usePlano } from "@/hooks/usePlano";
import { requestSession } from "@/lib/plan-access";
import type { Difficulty } from "@/lib/quiz";
import { trackProductEvent } from "@/lib/product-analytics";


export const Route = createFileRoute("/simulados")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/icon-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/icon-512.png" },
      { title: "Simulados e Modo Exame — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Pratique com simulados da carta de condução em Moçambique, incluindo um modo de exame independente com 25 questões e 30 minutos.",
      },
      { property: "og:title", content: "Simulados e Modo Exame — Carta MZ Quiz" },
      {
        property: "og:description",
        content: "Escolha o número de questões, a dificuldade e a fonte e gere o seu simulado.",
      },
      { name: "twitter:title", content: "Simulado da carta de condução em Moçambique — Carta MZ Quiz" },
      {
        name: "twitter:description",
        content: "Treine para o exame teórico INATRO com simulados cronometrados e questões explicadas.",
      },
    ],
  }),
  component: Simulados,
});

const INATRO = { questions: 25, minutes: 30, maxErrors: 3 } as const;

function Simulados() {
  const plano = usePlano();
  const maxAllowed = plano.status.plan.maxExamQuestions;
  const [count, setCount] = useState(20);

  const [difficulty, setDifficulty] = useState<Difficulty | "todas">("todas");
  const [source, setSource] = useState<"todas" | "PDF" | "AUTHORED">("todas");
  const [timed, setTimed] = useState(true);
  const [started, setStarted] = useState(false);
  const [granted, setGranted] = useState(count);
  const [limitOpen, setLimitOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [official, setOfficial] = useState(false);

  useEffect(() => {
    setCount(maxAllowed >= 30 ? 30 : maxAllowed);
  }, [maxAllowed]);

  async function start(isOfficial = false) {
    if (isOfficial && maxAllowed < INATRO.questions) {
      setLimitOpen(true);
      return;
    }
    setStarting(true);
    setOfficial(isOfficial);
    const wanted = isOfficial ? INATRO.questions : count;
    try {
      const grant = await requestSession("simulado", wanted);
      if (!grant.allowed) {
        setLimitOpen(true);
        return;
      }
      if (grant.grantedQuestions < wanted) {
        if (isOfficial) {
          toast.error("O modo de exame de 25 questões requer um plano que permita simulados completos.");
          return;
        }
        toast.info(
          `O teu plano permite simulados até ${grant.maxQuestions} questões. Vamos usar ${grant.grantedQuestions}.`,
        );
      }
      setGranted(grant.grantedQuestions);
      trackProductEvent("simulation_start");
      setStarted(true);
    } catch {
      toast.error("Não foi possível iniciar o simulado. Tente novamente.");
    } finally {
      setStarting(false);
    }
  }

    if (started) {
    return (
      <AppShell>
        <div className="relative -mx-4 -mt-8 min-h-screen pt-20 px-4">
          <div className="absolute inset-0 -z-10 bg-[url('https://images.unsplash.com/photo-1454165833767-027ffea9e778?q=80&w=2070')] bg-cover bg-fixed">
            <div className="absolute inset-0 bg-background/40 backdrop-blur-md" />
          </div>
          <QuizEngine
            mode="simulado"
            title={official ? "Modo exame — simulação independente" : "Exame simulado"}
            config={official ? { count: granted } : { count: granted, difficulty, source }}
            {...(official
              ? { timeLimitSeconds: INATRO.minutes * 60, maxErrors: INATRO.maxErrors }
              : timed
                ? { timeLimitSeconds: granted * 60 }
                : {})}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="relative -mx-4 -mt-8 min-h-screen px-4 pt-24 pb-16">
        <div className="absolute inset-0 -z-10 bg-[url('https://images.unsplash.com/photo-1454165833767-027ffea9e778?q=80&w=2070')] bg-cover bg-fixed">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
        </div>

        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Exame simulado</h1>
          <p className="mt-3 text-lg font-medium text-muted-foreground">
            Treine para o exame teórico INATRO com um simulado da carta de condução em Moçambique.
            Durante o exame não são mostradas explicações nem respostas; o resultado aparece no fim.
          </p>

          <div className="liquid-glass mt-8 p-5 sm:p-8 border border-primary/30">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-8 w-8 shrink-0 text-primary" />
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold">Modo exame — simulação independente</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {INATRO.questions} perguntas · {INATRO.minutes} minutos · máximo {INATRO.maxErrors} erros.
                  Ao {INATRO.maxErrors + 1}.º erro o simulado termina como "NÃO APTO". Esta plataforma não representa o INATRO.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={starting || maxAllowed < INATRO.questions}
              onClick={() => void start(true)}
              className="liquid-button mt-5 w-full !py-4 text-base disabled:cursor-not-allowed disabled:opacity-50"
            >
              {starting && official ? "A preparar simulado..." : "Iniciar modo exame"}
            </button>
            {maxAllowed < INATRO.questions && (
              <p className="mt-3 text-sm text-muted-foreground">
                O plano {plano.status.plan.name} permite até {maxAllowed} questões por simulado. O modo de 25 questões está disponível nos planos superiores.{" "}
                <Link to="/precos" className="font-semibold text-primary hover:underline">Ver planos</Link>
              </p>
            )}
          </div>

          <h2 className="mt-10 font-display text-lg font-bold">Simulado personalizado</h2>
          <div className="liquid-glass mt-4 space-y-8 p-5 sm:p-8">
            <fieldset>
              <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Número de perguntas</legend>
              <div className="mt-4 flex flex-wrap gap-3">
                {[10, 20, 30, 40, 50].map((n) => {
                  const locked = n > maxAllowed;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={locked}
                      title={locked ? `Disponível em planos superiores (limite: ${maxAllowed})` : undefined}
                      onClick={() => setCount(n)}
                      className={`h-12 min-w-[3rem] rounded-2xl border px-5 text-sm font-bold transition-all ${
                        count === n 
                          ? "border-primary bg-primary text-white shadow-lg shadow-primary/20" 
                          : "border-white/10 bg-white/5 text-foreground/80 hover:bg-white/10"
                      } ${locked ? "cursor-not-allowed opacity-30" : ""}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              {maxAllowed < 50 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  O plano <span className="font-bold text-foreground">{plano.status.plan.name}</span> permite simulados até {maxAllowed} questões.{" "}
                  <Link to="/precos" className="font-bold text-primary hover:underline">
                    Ver planos
                  </Link>
                </p>
              )}
            </fieldset>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Dificuldade
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty | "todas")}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  <option value="todas" className="bg-background">Todas</option>
                  <option value="facil" className="bg-background">Fácil</option>
                  <option value="medio" className="bg-background">Médio</option>
                  <option value="dificil" className="bg-background">Difícil</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Fonte das questões
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as "todas" | "PDF" | "AUTHORED")}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  <option value="todas" className="bg-background">Todas</option>
                  <option value="PDF" className="bg-background">Materiais fornecidos</option>
                  <option value="AUTHORED" className="bg-background">Criadas pela plataforma</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 liquid-glass !rounded-2xl p-4 bg-white/5">
              <input
                id="timed"
                type="checkbox"
                checked={timed}
                onChange={(e) => setTimed(e.target.checked)}
                className="h-6 w-6 rounded-md border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <label htmlFor="timed" className="text-base font-semibold cursor-pointer">
                Cronometrado ({count} minutos)
              </label>
            </div>

            <div className="rounded-2xl bg-primary/10 border border-primary/20 p-5 text-sm">
              <p className="font-bold text-primary uppercase tracking-tight">Instruções</p>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                <span className="font-bold text-foreground">{count}</span> perguntas · <span className="font-bold text-foreground">{timed ? `${count} minutos` : "sem limite de tempo"}</span> · uma resposta
                correcta por pergunta. Pode marcar questões para rever mais tarde.
              </p>
            </div>

            <button
              type="button"
              disabled={starting}
              onClick={() => void start(false)}
              className="liquid-button w-full !py-4 text-base"
            >
              {starting ? "A preparar simulado..." : "Gerar Simulado"}
            </button>
          </div>
        </div>
      </div>

      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />
    </AppShell>
  );
}
