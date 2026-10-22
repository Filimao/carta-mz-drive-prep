import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Check, ClipboardList, ShieldCheck, Signpost, WifiOff } from "lucide-react";
import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { CategoryIcon } from "@/lib/category-icons";
import { countQuestions, fetchCategories } from "@/lib/quiz";
import { PLANS } from "@/lib/plans";
import { trackProductEvent } from "@/lib/product-analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Carta MZ Quiz — Exame teórico de condução em Moçambique" },
      {
        name: "description",
        content:
          "Prepare-se para o exame teórico de condução em Moçambique com questões explicadas, mini-teste grátis, simulados e sinais de trânsito.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/icon-512.png" },
      {
        property: "og:title",
        content: "Prepare-se para o exame teórico de condução | Carta MZ Quiz",
      },
      {
        property: "og:description",
        content:
          "Experimente um mini-teste grátis e estude com questões, simulados, sinais e explicações em português.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/icon-512.png" },
      { name: "twitter:title", content: "Carta MZ Quiz — Prepare-se para o exame teórico" },
      {
        name: "twitter:description",
        content: "Questões explicadas e simulados para a carta de condução em Moçambique.",
      },
    ],
  }),
  component: Index,
});

const FEATURES = [
  {
    icon: BookOpen,
    title: "Questões explicadas",
    description: "Pratique e compreenda a resposta, não apenas a letra certa.",
  },
  {
    icon: ClipboardList,
    title: "Simulados",
    description: "Treine com sessões cronometradas e reveja o seu desempenho.",
  },
  {
    icon: Signpost,
    title: "Sinais de trânsito",
    description: "Consulte sinais e explicações organizados por categoria.",
  },
  {
    icon: WifiOff,
    title: "Estudo offline",
    description: "Guarde questões neste dispositivo com o plano Premium.",
  },
];

function Index() {
  const { data: total } = useQuery({ queryKey: ["question-count"], queryFn: countQuestions });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  useEffect(() => trackProductEvent("landing_page_view"), []);

  return (
    <AppShell>
      <section className="relative -mx-3 -mt-4 overflow-hidden bg-[var(--hero-bg)] px-4 py-12 sm:-mx-4 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="liquid-glass max-w-3xl p-6 sm:p-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-white">
              CARTA MZ QUIZ
            </p>
            <h1 className="mt-6 font-display text-3xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Prepare-se para o exame teórico de condução em Moçambique
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
              Estude com questões explicadas, imagens, sinais de trânsito e simulados. Com o
              Premium, pode guardar o pacote de questões e continuar a estudar sem internet.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/mini-teste"
                onClick={() => trackProductEvent("try_free_click")}
                className="hero-button justify-center"
              >
                Experimentar grátis
              </Link>
              <Link
                to="/auth"
                onClick={() => trackProductEvent("create_account_click")}
                className="hero-button-outline justify-center"
              >
                Criar conta
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/60">
              {typeof total === "number" ? `${total} questões publicadas` : "Questões publicadas"} ·
              Sem criar conta para experimentar
            </p>
          </div>
        </div>
      </section>

      <section
        className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Funcionalidades"
      >
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <article key={title} className="surface rounded-2xl p-5">
            <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </article>
        ))}
      </section>

      <section className="mt-16" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="font-display text-2xl font-bold sm:text-3xl">
          Como funciona
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            [
              "1",
              "Escolha como estudar",
              "Experimente o mini-teste ou crie uma conta para praticar por tema.",
            ],
            [
              "2",
              "Responda e aprenda",
              "Receba feedback e explicações para compreender cada resposta.",
            ],
            [
              "3",
              "Acompanhe o seu desempenho",
              "Faça simulados e reveja os assuntos que precisam de mais prática.",
            ],
          ].map(([number, title, description]) => (
            <li key={number} className="liquid-glass rounded-2xl p-5 sm:p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 font-bold text-primary">
                {number}
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16" aria-labelledby="plans-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="plans-heading" className="font-display text-2xl font-bold sm:text-3xl">
              Comece grátis. Evolua ao seu ritmo.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha o acesso adequado às suas necessidades de estudo.
            </p>
          </div>
          <Link to="/precos" className="text-sm font-semibold text-primary hover:underline">
            Ver preços e benefícios
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {(["free", "pro", "premium"] as const).map((tier) => {
            const plan = PLANS[tier];
            return (
              <article
                key={tier}
                className={`surface rounded-2xl p-5 ${tier === "pro" ? "border-primary ring-1 ring-primary/40" : ""}`}
              >
                <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="mt-4 text-2xl font-bold">
                  {plan.priceMzn === 0 ? "Grátis" : `${plan.priceMzn} MT`}
                  {plan.priceMzn > 0 && (
                    <span className="ml-1 text-sm font-medium text-muted-foreground">/ mês</span>
                  )}
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {plan.benefits.slice(0, 3).map((benefit) => (
                    <li key={benefit} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className="mt-16 rounded-3xl border border-border bg-card/70 p-6 sm:p-8"
        aria-labelledby="trust-heading"
      >
        <div className="flex items-start gap-4">
          <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 id="trust-heading" className="font-display text-xl font-bold">
              Estude com informação clara
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              A Carta MZ Quiz é uma plataforma independente de estudo. O conteúdo não substitui os
              materiais oficiais, não representa uma entidade pública e não garante aprovação. As
              referências legais só são apresentadas quando confirmadas pela administração.
            </p>
          </div>
        </div>
        {categories && categories.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold">Temas disponíveis</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categories.slice(0, 4).map((category) => (
                <Link
                  key={category.id}
                  to="/categorias"
                  className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-secondary/50"
                >
                  <CategoryIcon name={category.icon} className="h-8 w-8 shrink-0 text-primary" />
                  <span className="text-sm font-semibold">{category.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/mini-teste"
            onClick={() => trackProductEvent("try_free_click")}
            className="hero-button justify-center"
          >
            Experimentar grátis
          </Link>
          <Link to="/sinais" className="hero-button-outline justify-center">
            Explorar sinais de trânsito
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
