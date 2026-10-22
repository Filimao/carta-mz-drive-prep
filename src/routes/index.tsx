import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Camera, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { CategoryIcon } from "@/lib/category-icons";
import { MiniTest } from "@/components/MiniTest";
import { countQuestions, countQuestionsWithImages, fetchCategories } from "@/lib/quiz";
import { trackProductEvent } from "@/lib/product-analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mini-teste grátis para o exame teórico | Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Prepare-se para o exame teórico de condução em Moçambique. Experimente 10 questões grátis, com explicações e imagens, sem criar conta.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/icon-512.png" },
      { property: "og:title", content: "Prepare-se para o exame teórico | Carta MZ Quiz" },
      {
        property: "og:description",
        content:
          "Experimente o mini-teste grátis e conheça as questões, explicações e imagens de estudo.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/icon-512.png" },
      { name: "twitter:title", content: "Mini-teste grátis | Carta MZ Quiz" },
      {
        name: "twitter:description",
        content: "10 questões grátis para preparação do exame teórico em Moçambique.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: questionCount } = useQuery({
    queryKey: ["question-count"],
    queryFn: countQuestions,
    staleTime: 60_000,
  });
  const { data: imageQuestionCount } = useQuery({
    queryKey: ["question-image-count"],
    queryFn: countQuestionsWithImages,
    staleTime: 60_000,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 60_000,
  });

  useEffect(() => trackProductEvent("landing_page_view"), []);

  return (
    <AppShell>
      <section className="relative -mx-3 -mt-4 overflow-hidden bg-[var(--hero-bg)] px-4 py-8 sm:-mx-4 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <div className="liquid-glass p-6 sm:p-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold tracking-wide text-white">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Preparação independente para o exame teórico de condução
            </p>
            <h1 className="mt-6 max-w-4xl font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
              Prepare-se para o exame teórico de condução em Moçambique
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/80 sm:text-lg">
              Pratique com questões explicadas, fotografias, sinais e simulados. Experimente
              primeiro sem criar conta; depois, registe-se para desbloquear todas as ferramentas de
              estudo e o modo offline.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {questionCount
                  ? `${questionCount} questões publicadas`
                  : "Questões de estudo publicadas"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white">
                <Camera className="h-4 w-4" aria-hidden="true" />
                {imageQuestionCount
                  ? `${imageQuestionCount} questões com fotografias`
                  : "Questões com fotografias"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                Acesso Total Gratuito · Fase de Lançamento Moçambique
              </span>
            </div>
            <p className="mt-4 text-xs text-white/65">
              Plataforma independente de preparação; não representa oficialmente o INATRO nem
              garante aprovação.
            </p>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto mt-10 max-w-5xl" aria-labelledby="study-categories">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="study-categories" className="font-display text-2xl font-bold">
                Explore temas do Código da Estrada
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Conheça algumas categorias disponíveis para estudar depois de criar a sua conta.
              </p>
            </div>
            <Link to="/auth" className="text-sm font-semibold text-primary hover:underline">
              Criar conta gratuita
            </Link>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 8).map((category) => (
              <li key={category.id} className="surface flex items-center gap-3 rounded-2xl p-4">
                <CategoryIcon name={category.icon} className="h-8 w-8 shrink-0 text-primary" />
                <span className="text-sm font-semibold">{category.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        id="mini-teste"
        className="mx-auto mt-10 max-w-4xl space-y-6"
        aria-labelledby="mini-test-title"
      >
        <header>
          <h2 id="mini-test-title" className="font-display text-2xl font-bold sm:text-3xl">
            Experimente o mini-teste gratuito
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Responda a 10 questões rápidas, receba feedback e veja o resultado sem iniciar sessão.
          </p>
        </header>
        <MiniTest />
      </section>

      <section className="mx-auto my-10 max-w-4xl text-center">
        <Link
          to="/auth"
          onClick={() => trackProductEvent("create_account_click")}
          className="hero-button inline-flex justify-center"
        >
          Criar conta gratuita
        </Link>
      </section>
    </AppShell>
  );
}
