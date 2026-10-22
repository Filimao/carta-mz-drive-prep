import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LimitModal } from "@/components/PlanGate";
import { QuizEngine } from "@/components/QuizEngine";
import { usePlano } from "@/hooks/usePlano";
import { requestSession } from "@/lib/plan-access";
import { fetchCategories, type Difficulty } from "@/lib/quiz";
import { trackProductEvent } from "@/lib/product-analytics";
import { requireRouteAuth } from "@/lib/route-auth";


export const Route = createFileRoute("/praticar")({
  ssr: false,
  beforeLoad: requireRouteAuth,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const plano = usePlano();
  const maxAllowed = plano.status.plan.maxQuestionsPerQuiz;
  const [count, setCount] = useState(10);
  const [categoryId, setCategoryId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty | "todas">("todas");
  const [started, setStarted] = useState(false);
  const [granted, setGranted] = useState(count);
  const [limitOpen, setLimitOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    setCount(maxAllowed >= 20 ? 20 : 10);
  }, [maxAllowed]);

  async function start() {
    setStarting(true);
    try {
      const grant = await requestSession("pratica", count);
      if (!grant.allowed) {
        setLimitOpen(true);
        return;
      }
      if (grant.grantedQuestions < count) {
        toast.info(
          `O teu plano permite ${grant.maxQuestions} questões por sessão. Vamos começar com ${grant.grantedQuestions}.`,
        );
      }
      setGranted(grant.grantedQuestions);
      trackProductEvent("practice_start");
      setStarted(true);
    } catch {
      toast.error("Não foi possível iniciar a sessão. Tente novamente.");
    } finally {
      setStarting(false);
    }
  }

    if (started) {
    return (
      <AppShell>
        <div className="relative -mx-4 -mt-8 min-h-screen pt-20 px-4">
          <div className="absolute inset-0 -z-10 bg-[url('https://images.unsplash.com/photo-1449965072333-66e01a441595?q=80&w=2070')] bg-cover bg-fixed">
            <div className="absolute inset-0 bg-background/40 backdrop-blur-md" />
          </div>
          <QuizEngine
            mode="pratica"
            title="Modo Prática"
            config={{ count: granted, categoryId: categoryId || null, difficulty }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="relative -mx-4 -mt-8 min-h-screen px-4 pt-24 pb-16">
        <div className="absolute inset-0 -z-10 bg-[url('https://images.unsplash.com/photo-1449965072333-66e01a441595?q=80&w=2070')] bg-cover bg-fixed">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
        </div>

        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-4xl font-bold tracking-tight">Modo Prática</h1>
          <p className="mt-3 text-lg font-medium text-muted-foreground">
            Sem limite de tempo. Vê a explicação logo depois de cada resposta.
          </p>

          <div className="liquid-glass mt-10 space-y-8 p-8">
            <fieldset>
              <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Número de questões</legend>
              <div className="mt-4 flex flex-wrap gap-3">
                {[10, 20, 30, 50, 100].map((n) => {
                  const locked = n > maxAllowed;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={locked}
                      title={locked ? `Disponível em planos superiores (limite: ${maxAllowed})` : undefined}
                      onClick={() => setCount(n)}
                      className={`h-12 min-w-[3rem] rounded-2xl border px-5 text-sm font-bold transition-all ${
                        count === n 
                          ? "border-primary bg-primary text-white shadow-lg shadow-primary/20" 
                          : "border-white/10 bg-white/5 text-foreground/80 hover:bg-white/10"
                      } ${locked ? "cursor-not-allowed opacity-30" : ""}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              {maxAllowed < 100 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  O plano <span className="font-bold text-foreground">{plano.status.plan.name}</span> permite até {maxAllowed} questões.{" "}
                  <Link to="/precos" className="font-bold text-primary hover:underline">
                    Ver planos
                  </Link>
                </p>
              )}
            </fieldset>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Categoria
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  <option value="" className="bg-background">Todas as categorias</option>
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id} className="bg-background">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Dificuldade
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty | "todas")}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  <option value="todas" className="bg-background">Todas</option>
                  <option value="facil" className="bg-background">Fácil</option>
                  <option value="medio" className="bg-background">Médio</option>
                  <option value="dificil" className="bg-background">Difícil</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={starting}
              onClick={() => void start()}
              className="liquid-button w-full !py-4 text-base"
            >
              {starting ? "A preparar sessão..." : "Começar Prática"}
            </button>
          </div>
        </div>
      </div>

      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />
    </AppShell>
  );
}
