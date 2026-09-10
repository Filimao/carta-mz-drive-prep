import { supabase } from "@/integrations/supabase/client";
import { PLANS, planOf, type PlanDefinition, type PlanTier } from "@/lib/plans";

export const PAYMENT_NUMBERS = {
  mpesa: "879132543",
  emola: "850147162",
} as const;

export const SUPPORT_WHATSAPP = "https://wa.me/258879132543";

export const PLAN_BADGE: Record<PlanTier, string> = {
  free: "bg-muted text-muted-foreground border border-border",
  pro: "bg-primary/15 text-primary border border-primary/40",
  premium:
    "bg-[oklch(0.82_0.15_85_/_0.18)] text-[oklch(0.72_0.14_85)] border border-[oklch(0.72_0.14_85_/_0.45)]",
};

export interface PlanStatus {
  authenticated: boolean;
  tier: PlanTier;
  plan: PlanDefinition;
  expiresAt: string | null;
  expired: boolean;
  sessionsUsedToday: number;
  paymentPending: boolean;
}

export const GUEST_STATUS: PlanStatus = {
  authenticated: false,
  tier: "free",
  plan: PLANS.free,
  expiresAt: null,
  expired: false,
  sessionsUsedToday: 0,
  paymentPending: false,
};

interface RawStatus {
  authenticated?: boolean;
  plan?: string;
  expires_at?: string | null;
  expired?: boolean;
  sessions_used_today?: number;
  payment_pending?: boolean;
}

/** Reads the plan from the server (expiry-aware, cannot be faked on the client). */
export async function fetchPlanStatus(): Promise<PlanStatus> {
  try {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) return GUEST_STATUS;
    const { data, error } = await supabase.rpc("my_plan_status");
    if (error) throw error;
    const raw = (data ?? {}) as RawStatus;
    return {
      authenticated: raw.authenticated ?? true,
      tier: (raw.plan as PlanTier) ?? "free",
      plan: planOf(raw.plan),
      expiresAt: raw.expires_at ?? null,
      expired: raw.expired ?? false,
      sessionsUsedToday: raw.sessions_used_today ?? 0,
      paymentPending: raw.payment_pending ?? false,
    };
  } catch {
    return GUEST_STATUS;
  }
}

export interface SessionGrant {
  allowed: boolean;
  reason?: "daily_limit";
  tier: PlanTier;
  maxQuestions: number;
  grantedQuestions: number;
  sessionsUsed: number;
  sessionsLimit: number | null;
}

/**
 * Asks the backend for permission to start a session. The database decides the
 * question cap and the daily quota, so the limits cannot be bypassed client-side.
 * Guests fall back to the Free rules stored on the device.
 */
export async function requestSession(
  mode: string,
  requested: number,
): Promise<SessionGrant & { guest?: boolean }> {
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) {
    const { canStartSession, countSessionStart, sessionsToday } = await import("@/lib/plans");
    const free = PLANS.free;
    const cap = mode === "simulado" ? free.maxExamQuestions : free.maxQuestionsPerQuiz;
    if (!canStartSession(free)) {
      return {
        allowed: false,
        reason: "daily_limit",
        tier: "free",
        maxQuestions: cap,
        grantedQuestions: 0,
        sessionsUsed: sessionsToday(),
        sessionsLimit: free.dailyQuizzes,
        guest: true,
      };
    }
    countSessionStart();
    return {
      allowed: true,
      tier: "free",
      maxQuestions: cap,
      grantedQuestions: Math.min(requested, cap),
      sessionsUsed: sessionsToday(),
      sessionsLimit: free.dailyQuizzes,
      guest: true,
    };
  }

  try {
    const { data, error } = await supabase.rpc("start_study_session", {
      _mode: mode,
      _requested: requested,
    });
    if (error) throw error;
    const raw = (data ?? {}) as {
      allowed?: boolean;
      reason?: "daily_limit";
      plan?: string;
      max_questions?: number;
      granted_questions?: number;
      sessions_used?: number;
      sessions_limit?: number | null;
    };
    return {
      allowed: raw.allowed ?? false,
      ...(raw.reason ? { reason: raw.reason } : {}),
      tier: (raw.plan as PlanTier) ?? "free",
      maxQuestions: raw.max_questions ?? 15,
      grantedQuestions: raw.granted_questions ?? 0,
      sessionsUsed: raw.sessions_used ?? 0,
      sessionsLimit: raw.sessions_limit ?? null,
    };
  } catch (error) {
    return {
      allowed: false,
      reason: "daily_limit",
      tier: "free",
      maxQuestions: 15,
      grantedQuestions: 0,
      sessionsUsed: 0,
      sessionsLimit: null,
      guest: !!error,
    } as SessionGrant & { guest?: boolean };
  }
}
