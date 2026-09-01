import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LimitModal } from "@/components/PlanGate";
import { QuizEngine } from "@/components/QuizEngine";
import { usePlano } from "@/hooks/usePlano";
import { requestSession } from "@/lib/plan-access";
import type { Difficulty } from "@/lib/quiz";


export const Route = createFileRoute("/simulados")({
  head: () => ({
    meta: [
      { title: "Simulados e Modo Exame — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Gere simulados equilibrados com tempo cronometrado, sem ver respostas antes de terminar, como no exame real.",
      },
      { property: "og:title", content: "Simulados e Modo Exame — Carta MZ Quiz" },
      {
        property: "og:description",
        content: "Escolha o número de questões, a dificuldade e a fonte e gere o seu simulado.",
      },
    ],
  }),
  component: Simulados,
});

function Simulados() {
  const [count, setCount] = useState(30);
  const [difficulty, setDifficulty] = useState<Difficulty | "todas">("todas");
  const [source, setSource] = useState<"todas" | "PDF" | "AUTHORED">("todas");
  const [timed, setTimed] = useState(true);
  const [started, setStarted] = useState(false);
  const [granted, setGranted] = useState(count);
  const [limitOpen, setLimitOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  async function start() {
    setStarting(true);
    try {
      const grant = await requestSession("simulado", count);
      if (!grant.allowed) {
        setLimitOpen(true);
        return;
      }
      if (grant.grantedQuestions < count) {
        toast.info(
          `O teu plano permite simulados até ${grant.maxQuestions} questões. Vamos usar ${grant.grantedQuestions}.`,
        );
      }
      setGranted(grant.grantedQuestions);
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
        <QuizEngine
          mode="simulado"
          title="Exame simulado"
          config={{ count: granted, difficulty, source }}
          {...(timed ? { timeLimitSeconds: granted * 60 } : {})}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-semibold">Exame simulado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Durante o exame não são mostradas explicações nem respostas. O resultado aparece no fim.
      </p>

      <div className="surface mt-6 space-y-6 rounded-3xl p-6">
        <fieldset>
          <legend className="text-sm font-semibold">Número de perguntas</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {[10, 20, 30, 40, 50].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                  count === n ? "border-primary bg-primary/10 text-primary" : "border-border"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Dificuldade
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty | "todas")}
              className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-normal"
            >
              <option value="todas">Todas</option>
              <option value="facil">Fácil</option>
              <option value="medio">Médio</option>
              <option value="dificil">Difícil</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Fonte das questões
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as "todas" | "PDF" | "AUTHORED")}
              className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-normal"
            >
              <option value="todas">Todas</option>
              <option value="PDF">Materiais fornecidos</option>
              <option value="AUTHORED">Criadas pela plataforma</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={timed}
            onChange={(e) => setTimed(e.target.checked)}
            className="h-4 w-4"
          />
          Cronometrado ({count} minutos)
        </label>

        <div className="rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Instruções</p>
          <p className="mt-1">
            {count} perguntas · {timed ? `${count} minutos` : "sem limite de tempo"} · uma resposta
            correcta por pergunta. Pode marcar questões para rever mais tarde.
          </p>
        </div>

        <button
          type="button"
          disabled={starting}
          onClick={() => void start()}
          className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:w-auto"
        >
          {starting ? "A preparar..." : "Gerar simulado"}
        </button>
      </div>

      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

    </AppShell>
  );
}
