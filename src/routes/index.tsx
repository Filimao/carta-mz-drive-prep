import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Camera, ShieldCheck, Sparkles, Trophy, Target, Globe, Smartphone, BrainCircuit, Users } from "lucide-react";
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
            <h2 className="font-display text-3xl font-bold sm:text-4xl text-white">Porquê estudar connosco?</h2>
            <p className="mt-4 text-lg text-white/60">A ferramenta mais completa para o teu sucesso no exame teórico.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { 
                icon: BrainCircuit, 
                title: "IA Generativa", 
                desc: "Dúvidas numa questão? O nosso tutor de IA explica o Código da Estrada de forma simples e direta." 
              },
              { 
                icon: Smartphone, 
                title: "Modo Offline", 
                desc: "Estuda em qualquer lugar, mesmo sem internet. Descarrega os pacotes de questões e pratica no autocarro." 
              },
              { 
                icon: Target, 
                title: "Simulados Reais", 
                desc: "Ambiente idêntico ao do exame oficial, com cronómetro e a mesma distribuição de temas." 
              },
              { 
                icon: Trophy, 
                title: "Gamificação", 
                desc: "Ganha XP, sobe de nível e conquista badges enquanto dominas as regras de trânsito." 
              },
              { 
                icon: Users, 
                title: "Comunidade", 
                desc: "Vê como te comparas com outros candidatos e foca-te nos temas onde a maioria mais erra." 
              },
              { 
                icon: Globe, 
                title: "Actualizado 2024", 
                desc: "Questões baseadas na legislação mais recente e nos novos sinais de trânsito em vigor." 
              }
            ].map((feature, i) => (
              <div key={i} className="liquid-glass p-8 group hover:bg-white/5 transition-all">
                <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-white/60">{feature.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="liquid-glass p-10 text-center relative overflow-hidden bg-primary/5">
             <div className="relative z-10">
               <h3 className="font-display text-2xl font-bold text-white">Pronto para o próximo passo?</h3>
               <p className="mt-2 text-white/70">Acede ao teu painel de progresso e vê que temas precisas de reforçar.</p>
               <div className="mt-8 flex flex-wrap justify-center gap-4">
                 <Link to="/progresso" className="liquid-button">Ver Meu Progresso</Link>
                 <Link to="/simulados" className="liquid-button-outline">Fazer Simulado Completo</Link>
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
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Aprende. Pratica. Passa.</p>
            <div className="h-px w-20 bg-white/10" />
          </div>
        )}
      </section>
    </AppShell>
  );
}
