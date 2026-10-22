import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/AppShell";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { readiness } from "@/lib/readiness";
import { levelFor, readLocal, streakDays, type LocalState } from "@/lib/quiz";

export const Route = createFileRoute("/progresso")({
  head: () => ({
    meta: [
      { title: "O meu progresso — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Acompanhe a taxa de acerto, XP, nível, sequência de estudo e evolução dos seus simulados.",
      },
      { property: "og:title", content: "O meu progresso — Carta MZ Quiz" },
      {
        property: "og:description",
        content: "Estatísticas de desempenho e evolução ao longo dos dias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Progresso,
});

function Progresso() {
  const session = useSession();
  const [state, setState] = useState<LocalState | null>(null);
  useEffect(() => setState(readLocal()), []);
  const {
    data: simulations = [],
    isLoading: simulationsLoading,
    error: simulationsError,
    refetch: refetchSimulations,
  } = useQuery({
    queryKey: ["readiness-simulations", session.userId],
    enabled: Boolean(session.userId),
    queryFn: async () => {
      if (!session.userId) return [];
      const { data, error } = await supabase
        .from("quiz_sessions")
        .select("mode,total_questions,correct_count")
        .eq("user_id", session.userId)
        .eq("mode", "simulado")
        .eq("total_questions", 25)
        .order("completed_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []).map((result) => ({
        mode: result.mode,
        total: result.total_questions,
        correct: result.correct_count,
      }));
    },
  });

  if (session.loading || (session.userId && (!state || simulationsLoading))) {
    return (
      <AppShell>
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
      </AppShell>
    );
  }

  if (!session.userId) {
    return (
      <AppShell>
        <section className="surface mx-auto max-w-xl rounded-3xl p-6 text-center sm:p-10">
          <h1 className="font-display text-2xl font-bold">Acompanhe o seu progresso</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Crie uma conta ou inicie sessão para ver o histórico dos seus simulados e o Índice de
            Preparação.
          </p>
          <Link to="/auth" className="hero-button mt-6 inline-flex justify-center">
            Criar conta ou entrar
          </Link>
        </section>
      </AppShell>
    );
  }

  if (!state) return null;

  const answered = state.answers.length;
  const correct = state.answers.filter((a) => a.correct).length;
  const rate = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const best = state.sessions.reduce(
    (acc, s) => Math.max(acc, s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0),
    0,
  );
  const minutes = Math.round(state.sessions.reduce((acc, s) => acc + s.seconds, 0) / 60);
  const level = levelFor(state.xp);
  const preparation = readiness(simulations);
  const chart = state.sessions.slice(-10).map((s, i) => ({
    name: `#${i + 1}`,
    resultado: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
  }));

  const stats = [
    { label: "Quizzes realizados", value: state.sessions.length },
    { label: "Questões respondidas", value: answered },
    { label: "Taxa de acerto", value: `${rate}%` },
    { label: "Melhor resultado", value: `${best}%` },
    { label: "Sequência de estudo", value: `${streakDays(state.days)} dias` },
    { label: "Tempo estudado", value: `${minutes} min` },
    { label: "Questões dominadas", value: correct },
    { label: "Questões para rever", value: answered - correct },
  ];

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-semibold">O meu progresso</h1>

      <section className="mt-6 border-b border-border pb-6">
        <h2 className="font-display text-lg font-semibold">Índice de preparação</h2>
        {simulationsError ? (
          <div className="mt-3" role="alert">
            <p className="text-sm text-destructive">
              Não foi possível carregar os simulados recentes.
            </p>
            <button
              type="button"
              onClick={() => void refetchSimulations()}
              className="mt-2 text-sm font-semibold text-primary hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : preparation.exams > 0 ? (
          <>
            <p className="mt-2 font-display text-4xl font-bold text-primary">
              {preparation.index}%
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {preparation.passed} de {preparation.exams} simulados recentes de 25 questões
              concluídos com até 3 erros.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Complete um simulado de 25 questões para desbloquear o índice baseado no seu desempenho
            recente.
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Desempenho nos últimos 10 simulados; não é uma garantia de aprovação no exame.
        </p>
      </section>

      <div className="surface mt-6 rounded-3xl p-6">
        <p className="text-sm text-muted-foreground">Nível actual</p>
        <p className="font-display text-2xl font-semibold">{level.name}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${level.progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {state.xp} XP {level.next ? `· próximo nível: ${level.next}` : "· nível máximo"}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="surface rounded-2xl p-4">
            <p className="font-display text-xl font-semibold">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="surface mt-6 rounded-3xl p-6">
        <h2 className="font-display text-lg font-semibold">Meu desempenho</h2>
        {chart.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Complete um quiz para começar a ver a sua evolução aqui.
          </p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="resultado"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </AppShell>
  );
}
