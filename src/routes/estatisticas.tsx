import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/AppShell";
import { ExpiredBanner, UpgradeRequired } from "@/components/PlanGate";
import { usePlano } from "@/hooks/usePlano";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/estatisticas")({
  head: () => ({
    meta: [
      { title: "Estatísticas avançadas — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Taxa de acerto por tema, evolução por categoria e pontos fracos — estatísticas avançadas do plano Premium.",
      },
      { property: "og:title", content: "Estatísticas avançadas — Carta MZ Quiz" },
      { property: "og:description", content: "Descubra os temas onde precisa de treinar mais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Estatisticas;
});

function Estatisticas() {
  const plano = usePlano();
  const allowed = plano.status.plan.advancedStats && !plano.status.expired;

  const { data, isLoading } = useQuery({
    queryKey: ["stats-por-categoria"],
    enabled: allowed,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return [];
      const [answers, categories] = await Promise.all([
        supabase
          .from("quiz_answers")
          .select("is_correct,question_id,questions(category_id)")
          .eq("user_id", userId)
          .limit(2000),
        supabase.from("categories").select("id,name,emoji"),
      ]);
      const byCat = new Map<string, { total: number; correct: number }>();
      for (const row of (answers.data ?? []) as unknown as {
        is_correct: boolean;
        questions: { category_id: string | null } | null;
      }[]) {
        const cat = row.questions?.category_id;
        if (!cat) continue;
        const entry = byCat.get(cat) ?? { total: 0, correct: 0 };
        entry.total += 1;
        if (row.is_correct) entry.correct += 1;
        byCat.set(cat, entry);
      }
      return (categories.data ?? [])
        .map((c) => {
          const e = byCat.get(c.id);
          return {
            name: `${c.emoji} ${c.name}`,
            respondidas: e?.total ?? 0,
            acerto: e && e.total > 0 ? Math.round((e.correct / e.total) * 100) : 0,
          };
        })
        .filter((r) => r.respondidas > 0)
        .sort((a, b) => a.acerto - b.acerto);
    },
  });

  if (plano.loading) {
    return (
      <AppShell>
        <div className="surface h-64 animate-pulse rounded-3xl" />
      </AppShell>
    );
  }

  if (!allowed) {
    return (
      <AppShell>
        {plano.status.expired && <ExpiredBanner />}
        <UpgradeRequired feature="Estatísticas avançadas" plan="Premium" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-semibold">Estatísticas avançadas</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Taxa de acerto por tema, dos mais fracos para os mais fortes. Ataca primeiro o topo da lista!
      </p>

      {isLoading ? (
        <div className="surface mt-6 h-80 animate-pulse rounded-3xl" />
      ) : (data ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Responda a algumas questões com a sessão iniciada para ver a análise por tema.
        </p>
      ) : (
        <>
          <section className="surface mt-6 rounded-3xl p-6">
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data ?? []} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis type="category" dataKey="name" width={140} stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="acerto" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((row) => (
              <li key={row.name} className="surface rounded-2xl p-4">
                <p className="text-sm font-semibold">{row.name}</p>
                <p className="mt-1 font-display text-xl font-bold">{row.acerto}%</p>
                <p className="text-xs text-muted-foreground">{row.respondidas} questões respondidas</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}
