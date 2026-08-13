export type PlanTier = "free" | "pro" | "premium";

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  priceMzn: number;
  period: string;
  tagline: string;
  maxQuestionsPerQuiz: number;
  maxExamQuestions: number;
  dailyQuizzes: number | null;
  smartReview: boolean;
  advancedStats: boolean;
  offline: boolean;
  benefits: string[];
  limits: string[];
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: "free",
    name: "Free",
    priceMzn: 0,
    period: "sempre",
    tagline: "Para começar a estudar hoje mesmo.",
    maxQuestionsPerQuiz: 15,
    maxExamQuestions: 20,
    dailyQuizzes: 3,
    smartReview: false,
    advancedStats: false,
    offline: false,
    benefits: [
      "Até 15 questões por prática",
      "Simulados curtos até 20 questões",
      "3 sessões por dia",
      "Explicações das respostas",
    ],
    limits: ["Sem revisão inteligente", "Sem estatísticas avançadas", "Sem modo offline"],
  },
  pro: {
    tier: "pro",
    name: "Pro",
    priceMzn: 97,
    period: "por mês",
    tagline: "Para quem quer passar no primeiro exame.",
    maxQuestionsPerQuiz: 50,
    maxExamQuestions: 50,
    dailyQuizzes: null,
    smartReview: true,
    advancedStats: false,
    offline: false,
    benefits: [
      "Sessões ilimitadas por dia",
      "Até 50 questões por prática",
      "Simulados completos até 50 questões",
      "Revisão inteligente (repetição espaçada)",
      "Treino de erros e favoritos sem limite",
    ],
    limits: ["Sem estatísticas avançadas", "Sem modo offline completo"],
  },
  premium: {
    tier: "premium",
    name: "Premium",
    priceMzn: 180,
    period: "por mês",
    tagline: "Tudo incluído, com estudo offline.",
    maxQuestionsPerQuiz: 100,
    maxExamQuestions: 100,
    dailyQuizzes: null,
    smartReview: true,
    advancedStats: true,
    offline: true,
    benefits: [
      "Tudo do plano Pro",
      "Até 100 questões por sessão",
      "Estatísticas avançadas por categoria",
      "Modo offline completo (app instalável)",
      "Acesso antecipado a novas questões",
      "Apoio prioritário",
    ],
    limits: [],
  },
};

export const PLAN_ORDER: PlanTier[] = ["free", "pro", "premium"];

export function planOf(tier: string | null | undefined): PlanDefinition {
  return PLANS[(tier as PlanTier) ?? "free"] ?? PLANS.free;
}

/* ---- daily usage (client side, per device) ---- */

const USAGE_KEY = "carta-mz-usage-v1";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function sessionsToday(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = JSON.parse(window.localStorage.getItem(USAGE_KEY) ?? "{}") as Record<string, number>;
    return raw[today()] ?? 0;
  } catch {
    return 0;
  }
}

export function countSessionStart() {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.parse(window.localStorage.getItem(USAGE_KEY) ?? "{}") as Record<string, number>;
    const key = today();
    window.localStorage.setItem(USAGE_KEY, JSON.stringify({ [key]: (raw[key] ?? 0) + 1 }));
  } catch {
    /* ignore */
  }
}

export function canStartSession(plan: PlanDefinition): boolean {
  if (plan.dailyQuizzes === null) return true;
  return sessionsToday() < plan.dailyQuizzes;
}
