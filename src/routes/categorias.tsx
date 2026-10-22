import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { CategoryIcon } from "@/lib/category-icons";
import { QuizEngine } from "@/components/QuizEngine";
import { fetchCategories, readLocal } from "@/lib/quiz";
import { requireRouteAuth } from "@/lib/route-auth";

export const Route = createFileRoute("/categorias")({
  ssr: false,
  beforeLoad: requireRouteAuth,
  validateSearch: (search: Record<string, unknown>): { categoria?: string | undefined } => ({
    categoria: typeof search["categoria"] === "string" ? search["categoria"] : undefined,
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [active, setActive] = useState<{ id: string; name: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [term, setTerm] = useState("");

  // deep-link: /categorias?categoria=<id|slug> abre directamente a pratica do tema
  useEffect(() => {
    if (dismissed || !search.categoria || !data) return;
    const match = data.find((c) => c.id === search.categoria || c.slug === search.categoria);
    if (match) setActive({ id: match.id, name: match.name });
  }, [dismissed, search.categoria, data]);

  if (active) {
    return (
      <AppShell>
        <div className="relative -mx-4 -mt-8 min-h-screen px-4 pt-20">
          <div className="absolute inset-0 -z-10 bg-[url('https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=2067')] bg-cover bg-fixed">
            <div className="absolute inset-0 bg-background/40 backdrop-blur-md" />
          </div>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              setActive(null);
              void navigate({ to: "/categorias" });
            }}
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
              <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
                Categorias de Estudo
              </h1>
              <p className="mt-2 text-lg font-medium text-foreground/70">
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
                className="w-full rounded-2xl border border-glass-line bg-glass-overlay px-4 py-3.5 text-foreground placeholder:text-foreground/40 focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-3xl bg-glass-overlay border border-glass-line"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-16 text-center py-20 liquid-glass">
              <p className="text-xl font-medium text-foreground/70">
                Nenhum tema corresponde à pesquisa.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((cat) => (
                <article
                  key={cat.id}
                  className="liquid-glass flex flex-col p-6 group hover:bg-glass-overlay-strong transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <CategoryIcon name={cat.icon} className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground mb-2">
                    {cat.name}
                  </h2>
                  <p className="flex-1 text-sm leading-relaxed text-muted-foreground mb-6">
                    {cat.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-glass-line">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
