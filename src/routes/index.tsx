import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Camera,
  ShieldCheck,
  Sparkles,
  Trophy,
  Target,
  Globe,
  Smartphone,
  BrainCircuit,
  Users,
  ArrowRight,
} from "lucide-react";
import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { CategoryIcon } from "@/lib/category-icons";
import { MiniTest } from "@/components/MiniTest";
import { countQuestions, countQuestionsWithImages, fetchCategories } from "@/lib/quiz";
import { trackProductEvent } from "@/lib/product-analytics";
import { useSession } from "@/hooks/useSession";

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
  const session = useSession();
  const isGuest = !session.userId;
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

  const categoriesHref = isGuest ? "/auth" : "/categorias";
  const categoryHref = (id: string) => (isGuest ? "/auth" : `/categorias?categoria=${id}`);

  return (
    <AppShell>
      <section className="relative -mx-3 -mt-4 overflow-hidden bg-[var(--hero-bg)] px-4 py-8 sm:-mx-4 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <div className="liquid-glass p-6 sm:p-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-glass-line-strong bg-glass-overlay-strong px-4 py-2 text-xs font-semibold tracking-wide text-foreground">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Preparação independente para o exame teórico de condução
            </p>
            <h1 className="mt-6 max-w-4xl font-display text-3xl font-bold leading-tight text-foreground sm:text-5xl">
              Prepare-se para o exame teórico de condução em Moçambique
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-foreground/80 sm:text-lg">
              {isGuest
                ? "Pratique com questões explicadas, fotografias, sinais e simulados. Experimente primeiro sem criar conta; depois, registe-se para desbloquear todas as ferramentas de estudo e o modo offline."
                : "Pratique com questões explicadas, fotografias, sinais e simulados. Escolha um tema abaixo, reveja os seus erros e acompanhe o progresso guardado na sua conta."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-glass-line-strong bg-glass-overlay-strong px-3 py-2 text-sm font-semibold text-foreground">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {questionCount
                  ? `${questionCount} questões publicadas`
                  : "Questões de estudo publicadas"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-glass-line-strong bg-glass-overlay-strong px-3 py-2 text-sm font-semibold text-foreground">
                <Camera className="h-4 w-4" aria-hidden="true" />
                {imageQuestionCount
                  ? `${imageQuestionCount} questões com fotografias`
                  : "Questões com fotografias"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                Acesso Total Gratuito · Fase de Lançamento Moçambique
              </span>
            </div>
            <p className="mt-4 text-xs text-foreground/65">
              Plataforma independente de preparação; não representa oficialmente o INATRO nem
              garante aprovação.
            </p>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto mt-16 max-w-5xl" aria-labelledby="study-categories">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="study-categories" className="font-display text-2xl font-bold text-foreground">
                Explore temas do Código da Estrada
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isGuest
                  ? "Conheça as categorias disponíveis e estude cada tema depois de criar a sua conta."
                  : "Escolha um tema para praticar com questões explicadas e guardar o seu progresso."}
              </p>
            </div>
            <Link
              to={categoriesHref}
              onClick={() => {
                if (isGuest) trackProductEvent("create_account_click");
              }}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              {isGuest ? "Criar conta gratuita" : "Ver todas as categorias"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <li key={category.id} className="liquid-glass flex h-full flex-col p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <CategoryIcon name={category.icon} className="h-6 w-6" />
                  </span>
                  <h3 className="font-display text-base font-bold text-foreground">
                    {category.name}
                  </h3>
                </div>
                {category.description ? (
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {category.description}
                  </p>
                ) : (
                  <span className="mt-3 flex-1" />
                )}
                <Link
                  to={categoryHref(category.id)}
                  onClick={() => {
                    if (isGuest) trackProductEvent("create_account_click");
                  }}
                  className="mt-4 inline-flex items-center gap-1 self-start text-sm font-bold text-primary hover:underline"
                >
                  {isGuest ? "Criar conta para estudar" : "Estudar este tema"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!session.userId && (
        <section
          id="mini-teste"
          className="mx-auto mt-16 max-w-4xl space-y-6"
          aria-labelledby="mini-test-title"
        >
          <header className="text-center">
            <h2 id="mini-test-title" className="font-display text-3xl font-bold sm:text-4xl">
              Experimente o mini-teste gratuito
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Responda a 10 questões rápidas, receba feedback e veja o resultado sem iniciar sessão.
            </p>
          </header>
          <MiniTest />
        </section>
      )}

      {session.userId && (
        <section className="mx-auto mt-16 max-w-5xl space-y-12">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl text-foreground">
              Porquê estudar connosco?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A ferramenta mais completa para o teu sucesso no exame teórico.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: BrainCircuit,
                title: "IA Generativa",
                desc: "Dúvidas numa questão? O nosso tutor de IA explica o Código da Estrada de forma simples e direta.",
              },
              {
                icon: Smartphone,
                title: "Modo Offline",
                desc: "Estuda em qualquer lugar, mesmo sem internet. Descarrega os pacotes de questões e pratica no autocarro.",
              },
              {
                icon: Target,
                title: "Simulados Reais",
                desc: "Ambiente idêntico ao do exame oficial, com cronómetro e a mesma distribuição de temas.",
              },
              {
                icon: Trophy,
                title: "Gamificação",
                desc: "Ganha XP, sobe de nível e conquista badges enquanto dominas as regras de trânsito.",
              },
              {
                icon: Users,
                title: "Comunidade",
                desc: "Vê como te comparas com outros candidatos e foca-te nos temas onde a maioria mais erra.",
              },
              {
                icon: Globe,
                title: "Actualizado 2024",
                desc: "Questões baseadas na legislação mais recente e nos novos sinais de trânsito em vigor.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="liquid-glass p-8 group hover:bg-glass-overlay-strong transition-all"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="liquid-glass p-10 text-center relative overflow-hidden bg-primary/5">
            <div className="relative z-10">
              <h3 className="font-display text-2xl font-bold text-foreground">
                Pronto para o próximo passo?
              </h3>
              <p className="mt-2 text-muted-foreground">
                Acede ao teu painel de progresso e vê que temas precisas de reforçar.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link to="/progresso" className="liquid-button">
                  Ver Meu Progresso
                </Link>
                <Link to="/simulados" className="liquid-button-outline">
                  Fazer Simulado Completo
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto my-20 max-w-4xl text-center">
        {!session.userId ? (
          <Link
            to="/auth"
            onClick={() => trackProductEvent("create_account_click")}
            className="liquid-button !px-10 !py-4 text-lg"
          >
            Criar conta gratuita agora
          </Link>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
              Aprende. Pratica. Passa.
            </p>
            <div className="h-px w-20 bg-glass-overlay-strong" />
          </div>
        )}
      </section>
    </AppShell>
  );
}
