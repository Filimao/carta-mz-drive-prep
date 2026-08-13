import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { QuizEngine } from "@/components/QuizEngine";
import { fetchCategories, readLocal } from "@/lib/quiz";

export const Route = createFileRoute("/categorias")({
  head: () => ({
    meta: [
      { title: "Categorias de estudo — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Estude por tema: sinais de trânsito, prioridade, velocidade, álcool, condução nocturna e muito mais.",
      },
      { property: "og:title", content: "Categorias de estudo — Carta MZ Quiz" },
      {
        property: "og:description",
        content: "24 temas de estudo com prática dirigida para o exame teórico de condução.",
      },
    ],
  }),
  component: Categorias,
});

function Categorias() {
  const { data, isLoading } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const [active, setActive] = useState<{ id: string; name: string } | null>(null);
  const [term, setTerm] = useState("");

  if (active) {
    return (
      <AppShell>
        <button
          type="button"
          onClick={() => setActive(null)}
          className="mb-4 text-sm font-semibold text-primary"
        >
          ← Voltar às categorias
        </button>
        <QuizEngine
          mode="pratica"
          title={active.name}
          config={{ count: 20, categoryId: active.id }}
        />
      </AppShell>
    );
  }

  const answers = readLocal().answers;
  const filtered = (data ?? []).filter((c) =>
    c.name.toLowerCase().includes(term.trim().toLowerCase()),
  );

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-semibold">Categorias</h1>
      <input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Pesquisar tema (ex.: ultrapassagem)"
        aria-label="Pesquisar categoria"
        className="mt-4 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm"
      />

      {isLoading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Nenhum tema corresponde à pesquisa.</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cat) => (
            <article key={cat.id} className="surface flex flex-col rounded-2xl p-5">
              <p className="text-2xl">{cat.emoji}</p>
              <h2 className="mt-2 font-display text-base font-semibold">{cat.name}</h2>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                {cat.description}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {answers.length > 0 ? `${answers.length} respostas registadas` : "Ainda sem dados"}
              </p>
              <button
                type="button"
                onClick={() => setActive({ id: cat.id, name: cat.name })}
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Praticar
              </button>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
