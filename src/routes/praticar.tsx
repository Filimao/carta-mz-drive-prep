import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { QuizEngine } from "@/components/QuizEngine";
import { fetchCategories, type Difficulty } from "@/lib/quiz";

export const Route = createFileRoute("/praticar")({
  head: () => ({
    meta: [
      { title: "Modo Prática — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Pratique questões de condução sem limite de tempo, com explicação imediata de cada resposta.",
      },
      { property: "og:title", content: "Modo Prática — Carta MZ Quiz" },
      {
        property: "og:description",
        content: "Escolha o número de questões, a categoria e a dificuldade e comece a praticar.",
      },
    ],
  }),
  component: Praticar,
});

function Praticar() {
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const [count, setCount] = useState(20);
  const [categoryId, setCategoryId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty | "todas">("todas");
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <AppShell>
        <QuizEngine
          mode="pratica"
          title="Modo Prática"
          config={{ count, categoryId: categoryId || null, difficulty }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-semibold">Modo Prática</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sem limite de tempo. Vê a explicação logo depois de cada resposta.
      </p>

      <div className="surface mt-6 space-y-6 rounded-3xl p-6">
        <fieldset>
          <legend className="text-sm font-semibold">Número de questões</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {[10, 20, 30, 50, 100].map((n) => (
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
            Categoria
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm font-normal"
            >
              <option value="">Todas as categorias</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </label>
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
        </div>

        <button
          type="button"
          onClick={() => setStarted(true)}
          className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground sm:w-auto"
        >
          Começar prática
        </button>
      </div>
    </AppShell>
  );
}
