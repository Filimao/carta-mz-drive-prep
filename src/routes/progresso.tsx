import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/AppShell";
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
  const [state, setState] = useState<LocalState | null>(null);
  useEffect(() => setState(readLocal()), []);

  if (!state) {
    return (
      <AppShell>
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
      </AppShell>
    );
  }

  const answered = state.answers.length;
  const correct = state.answers.filter((a) => a.correct).length;
  const rate = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  const best = state.sessions.reduce(
    (acc, s) => Math.max(acc, s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0),
    0,
  );
  const minutes = Math.round(state.sessions.reduce((acc, s) => acc + s.seconds, 0) / 60);
  const level = levelFor(state.xp);
  const preparation = readiness(state.sessions);
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
        <p className="mt-2 font-display text-4xl font-bold text-primary">{preparation.index === null ? "—" : `${preparation.index}%`}</p>
        <p className="mt-2 text-sm text-muted-foreground">{preparation.exams ? `${preparation.passed} de ${preparation.exams} simulados de 25 questões com até 3 erros.` : "Ainda não há simulados de 25 questões concluídos."}</p>
        <p className="mt-1 text-xs text-muted-foreground">Desempenho nos últimos 10 simulados; não é uma garantia de aprovação no exame.</p>
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
