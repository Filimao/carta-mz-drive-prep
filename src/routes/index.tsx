import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, WifiOff, BookOpen, Trophy, Gauge } from "lucide-react";
import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { useSession } from "@/hooks/useSession";
import { CategoryIcon } from "@/lib/category-icons";
import { countQuestions, fetchCategories } from "@/lib/quiz";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Carta MZ Quiz — Simulados da Carta de Condução em Moçambique" },
      {
        name: "description",
        content:
          "Pratique questões de condução, sinais de trânsito e segurança rodoviária com simulados interactivos para preparação da carta de condução em Moçambique.",
      },
      { property: "og:title", content: "Carta MZ Quiz — Aprende. Pratica. Passa." },
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
  const session = useSession();
  const navigate = useNavigate();

  // O ecrã de entrada é o login: visitantes sem sessão vão directos para /auth.
  useEffect(() => {
    if (!session.loading && !session.userId) void navigate({ to: "/auth", replace: true });
  }, [session.loading, session.userId, navigate]);

  if (!session.loading && !session.userId) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">A abrir o ecrã de início de sessão...</p>
      </AppShell>
    );
  }

  return (
        <AppShell>
      <section className="relative -mx-4 -mt-8 min-h-[85vh] overflow-hidden px-4 pt-14 pb-16 sm:px-8 bg-[var(--hero-bg)]">
        <div className="mx-auto max-w-5xl">
          <div className="liquid-glass animate-fade-in-up p-6 md:p-10 lg:w-2/3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-white uppercase">
              APRENDE. PRATICA. PASSA.
            </span>
            
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight text-white sm:text-5xl md:text-7xl">
              Preparado para <br />
              <span style={{ color: '#2d5bd7' }}>passar no exame?</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg font-medium text-white/80">
              Pratique questões, faça simulados e acompanha o teu progresso para o exame oficial da carta de condução.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/praticar" className="hero-button group">
                Começar Quiz
              </Link>
              <Link to="/simulados" className="hero-button-outline">
                Fazer Simulado
              </Link>
              <span className="text-xs font-medium text-white/60">
                230+ questões · Simulados completos
              </span>
            </div>
          </div>

          <div className="mt-12 lg:mt-24">
            <div className="liquid-glass flex flex-wrap items-center gap-6 p-6">
              <div className="flex flex-1 flex-col gap-1 min-w-[120px]">
                <span className="text-xs font-bold text-white/60 uppercase">Categoria</span>
                <span className="text-lg font-semibold text-white">Ligeiros</span>
              </div>
              <div className="h-10 w-px bg-white/10 hidden md:block" />
              <div className="flex flex-1 flex-col gap-1 min-w-[120px]">
                <span className="text-xs font-bold text-white/60 uppercase">Tipo</span>
                <span className="text-lg font-semibold text-white">Simulado</span>
              </div>
              <div className="h-10 w-px bg-white/10 hidden md:block" />
              <div className="flex flex-1 flex-col gap-1 min-w-[120px]">
                <span className="text-xs font-bold text-white/60 uppercase">Dificuldade</span>
                <span className="text-lg font-semibold text-white">Intermédio</span>
              </div>
              <Link to="/praticar" className="hero-button w-full md:w-auto">
                Pesquisar Teste
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 px-4">

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

            <section className="mt-20">
        <h2 className="font-display text-3xl font-bold">Como funciona?</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step} className="liquid-glass group p-6 transition-all hover:bg-white/5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/20 text-xl font-bold text-primary group-hover:scale-110 transition-transform">
                {i + 1}
              </span>
              <p className="mt-4 text-lg font-semibold">{step}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Passo essencial para garantir que estás preparado para o sucesso no teu exame de condução.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20 mb-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold">Categorias de estudo</h2>
            <p className="mt-2 text-muted-foreground text-lg">Foca nos temas que mais precisas de praticar.</p>
          </div>
          <Link to="/categorias" className="text-sm font-bold text-primary hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(categories ?? []).slice(0, 8).map((cat) => (
            <Link
              key={cat.id}
              to="/categorias"
              className="liquid-glass p-6 transition-transform hover:-translate-y-2"
            >
              <CategoryIcon name={cat.icon} className="h-10 w-10 text-primary" />
              <p className="mt-4 text-lg font-bold">{cat.name}</p>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{cat.description}</p>
            </Link>
          ))}
        </div>
      </section>

    </AppShell>
  );
}
