import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { CategoryIcon } from "@/lib/category-icons";
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
        <div className="relative -mx-4 -mt-8 min-h-screen px-4 pt-20">
          <div className="absolute inset-0 -z-10 bg-[url('https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=2067')] bg-cover bg-fixed">
            <div className="absolute inset-0 bg-background/40 backdrop-blur-md" />
          </div>
          <button
            type="button"
            onClick={() => setActive(null)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            ← Voltar às categorias
          </button>
          <QuizEngine
            mode="pratica"
            title={active.name}
            config={{ count: 20, categoryId: active.id }}
          />
        </div>
      </AppShell>
    );
  }

  const answers = readLocal().answers;
  const filtered = (data ?? []).filter((c) =>
    c.name.toLowerCase().includes(term.trim().toLowerCase()),
  );

  return (
    <AppShell>
      <div className="relative -mx-4 -mt-8 min-h-screen px-4 pt-24 pb-16">
        <div className="absolute inset-0 -z-10 bg-[url('https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=2067')] bg-cover bg-fixed">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <h1 className="font-display text-4xl font-bold tracking-tight text-white">Categorias de Estudo</h1>
              <p className="mt-2 text-lg font-medium text-white/70">
                Foque o seu estudo nos temas mais importantes para o exame.
              </p>
            </div>
            <div className="w-full md:w-80">
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Pesquisar tema (ex.: sinais)"
                aria-label="Pesquisar categoria"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder:text-white/40 focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-3xl bg-white/5 border border-white/10" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-16 text-center py-20 liquid-glass">
              <p className="text-xl font-medium text-white/70">Nenhum tema corresponde à pesquisa.</p>
            </div>
          ) : (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((cat) => (
                <article key={cat.id} className="liquid-glass flex flex-col p-6 group hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <CategoryIcon name={cat.icon} className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-white mb-2">{cat.name}</h2>
                  <p className="flex-1 text-sm leading-relaxed text-white/60 mb-6">
                    {cat.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/40">
                      {answers.length > 0 ? `${answers.length} respostas` : "Novo tema"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActive({ id: cat.id, name: cat.name })}
                      className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                      ESTUDAR AGORA
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

