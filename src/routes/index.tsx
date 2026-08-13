import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, WifiOff, BookOpen, Trophy, Gauge } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { countQuestions, fetchCategories } from "@/lib/quiz";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Carta Fácil MZ — Simulados da Carta de Condução em Moçambique" },
      {
        name: "description",
        content:
          "Pratique questões de condução, sinais de trânsito e segurança rodoviária com simulados interactivos para preparação da carta de condução em Moçambique.",
      },
      { property: "og:title", content: "Carta Fácil MZ — Aprende. Pratica. Passa." },
      {
        property: "og:description",
        content:
          "Questões, simulados completos e acompanhamento de progresso para o exame teórico de condução em Moçambique.",
      },
    ],
  }),
  component: Index,
});

const STEPS = [
  "Escolha um tema",
  "Responda às questões",
  "Veja a explicação",
  "Reveja os seus erros",
  "Faça simulados",
  "Acompanhe a evolução",
];

function Index() {
  const { data: total } = useQuery({ queryKey: ["question-count"], queryFn: countQuestions });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  return (
    <AppShell>
      <section className="hero-gradient -mx-4 -mt-8 px-4 pt-14 pb-16 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold">
            Aprende. Pratica. Passa.
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold sm:text-6xl">Carta Fácil MZ</h1>
          <p className="mt-4 text-lg font-medium">
            Prepare-se melhor para o exame teórico de condução.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Pratique questões, descubra os seus pontos fracos e faça simulados completos para chegar
            ao exame mais preparado.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/praticar"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
            >
              Começar Quiz <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/simulados"
              className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold"
            >
              Fazer Simulado
            </Link>
            <Link
              to="/categorias"
              className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold"
            >
              Estudar por Tema
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { icon: BookOpen, label: `${total ?? 200}+ questões` },
          { icon: Gauge, label: "Simulados completos" },
          { icon: ShieldCheck, label: "Explicações das respostas" },
          { icon: Trophy, label: "Progresso personalizado" },
          { icon: WifiOff, label: "Modo offline" },
        ].map((item) => (
          <div key={item.label} className="surface flex items-center gap-3 rounded-2xl p-4">
            <item.icon className="h-5 w-5 shrink-0 text-primary" />
            <span className="text-sm font-semibold">{item.label}</span>
          </div>
        ))}
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold">Como funciona?</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step} className="surface flex items-center gap-3 rounded-2xl p-4">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                {i + 1}
              </span>
              <span className="text-sm font-medium">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold">Categorias de estudo</h2>
          <Link to="/categorias" className="text-sm font-semibold text-primary">
            Ver todas
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(categories ?? []).slice(0, 8).map((cat) => (
            <Link
              key={cat.id}
              to="/categorias"
              className="surface rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
            >
              <p className="text-2xl">{cat.emoji}</p>
              <p className="mt-2 text-sm font-semibold">{cat.name}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{cat.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
