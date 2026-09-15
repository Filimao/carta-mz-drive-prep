import { supabase } from "@/integrations/supabase/client";

export type Difficulty = "facil" | "medio" | "dificil";
export type Letter = "A" | "B" | "C" | "D";

export interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  tip: string | null;
  difficulty: Difficulty;
  source: "PDF" | "AUTHORED";
  source_document: string | null;
  category_id: string | null;
  image_url: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  emoji: string;
  icon: string;
  sort_order: number;
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

export const LEVELS = [
  { name: "Iniciante", xp: 0 },
  { name: "Aprendiz", xp: 200 },
  { name: "Condutor", xp: 600 },
  { name: "Condutor Avançado", xp: 1400 },
  { name: "Especialista", xp: 3000 },
  { name: "Mestre da Estrada", xp: 6000 },
];

export function levelFor(xp: number) {
  let current = LEVELS[0]!;
  let index = 0;
  LEVELS.forEach((lvl, i) => {
    if (xp >= lvl.xp) {
      current = lvl;
      index = i;
    }
  });
  const next = LEVELS[index + 1];
  const progress = next ? Math.round(((xp - current.xp) / (next.xp - current.xp)) * 100) : 100;
  return { name: current.name, next: next?.name ?? null, progress };
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,slug,name,description,emoji,icon,sort_order")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function countQuestions(): Promise<number> {
  const { count, error } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);
  if (error) throw error;
  return count ?? 0;
}

export interface QuizConfig {
  count: number;
  categoryId?: string | null;
  difficulty?: Difficulty | "todas";
  source?: "todas" | "PDF" | "AUTHORED";
  ids?: string[];
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

const SELECT_COLUMNS =
  "id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,tip,difficulty,source,source_document,category_id,image_url";

const LETTER_KEYS: Letter[] = ["A", "B", "C", "D"];

/** Returns the text of the option identified by the given letter. */
export function getOptionText(q: Question, letter: Letter): string {
  return letter === "A"
    ? q.option_a
    : letter === "B"
      ? q.option_b
      : letter === "C"
        ? q.option_c
        : q.option_d;
}

/**
 * Randomiza a posição das alternativas de cada questão e recalcula a letra
 * correcta, para que a resposta certa não fique sempre na mesma opção.
 */
export function shuffleOptions(q: Question): Question {
  const entries = LETTER_KEYS.map((letter) => ({
    letter,
    text: getOptionText(q, letter),
  }));
  const shuffled = shuffle(entries);
  const correctIndex = shuffled.findIndex((e) => e.letter === q.correct_answer);
  return {
    ...q,
    option_a: shuffled[0]!.text,
    option_b: shuffled[1]!.text,
    option_c: shuffled[2]!.text,
    option_d: shuffled[3]!.text,
    correct_answer: LETTER_KEYS[correctIndex >= 0 ? correctIndex : 0]!,
  };
}

export async function fetchQuizQuestions(config: QuizConfig): Promise<Question[]> {
  let query = supabase.from("questions").select(SELECT_COLUMNS).eq("is_published", true);

  if (config.ids && config.ids.length > 0) query = query.in("id", config.ids);
  if (config.categoryId) query = query.eq("category_id", config.categoryId);
  if (config.difficulty && config.difficulty !== "todas")
    query = query.eq("difficulty", config.difficulty);
  if (config.source && config.source !== "todas") query = query.eq("source", config.source);

  const { data, error } = await query.limit(600);
  if (error) throw error;
  return shuffle((data ?? []) as Question[])
    .slice(0, config.count)
    .map(shuffleOptions);
}

export async function searchQuestions(term: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select(SELECT_COLUMNS)
    .eq("is_published", true)
    .ilike("question_text", `%${term}%`)
    .limit(40);
  if (error) throw error;
  return (data ?? []) as Question[];
}

/* ---------------- local (guest) state ---------------- */

const KEY = "carta-mz-local-v1";

export interface LocalState {
  xp: number;
  answers: { questionId: string; correct: boolean; at: string }[];
  favorites: string[];
  sessions: {
    mode: string;
    total: number;
    correct: number;
    seconds: number;
    at: string;
  }[];
  days: string[];
}

const EMPTY: LocalState = { xp: 0, answers: [], favorites: [], sessions: [], days: [] };

export function readLocal(): LocalState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as LocalState) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function writeLocal(next: LocalState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

/** Formats a date as YYYY-MM-DD in local time (not UTC). */
export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function recordAnswer(questionId: string, correct: boolean) {
  const state = readLocal();
  state.answers = [
    ...state.answers.filter((a) => a.questionId !== questionId),
    { questionId, correct, at: new Date().toISOString() },
  ];
  state.xp += correct ? 10 : 0;
  const today = toLocalDateKey();
  if (!state.days.includes(today)) state.days.push(today);
  writeLocal(state);
}

export function recordSession(mode: string, total: number, correct: number, seconds: number) {
  const state = readLocal();
  state.sessions = [
    ...state.sessions,
    { mode, total, correct, seconds, at: new Date().toISOString() },
  ].slice(-60);
  state.xp += mode === "simulado" ? 100 : 50;
  writeLocal(state);
  return state;
}

export function toggleFavorite(questionId: string) {
  const state = readLocal();
  state.favorites = state.favorites.includes(questionId)
    ? state.favorites.filter((id) => id !== questionId)
    : [...state.favorites, questionId];
  writeLocal(state);
  return state.favorites;
}

export function streakDays(days: string[]): number {
  if (days.length === 0) return 0;
  const set = new Set(days);
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = toLocalDateKey(cursor);
    if (!set.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function persistSession(payload: {
  mode: string;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  seconds: number;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return;
  const score = payload.total > 0 ? (payload.correct / payload.total) * 100 : 0;
  const { error } = await supabase.from("quiz_sessions").insert({
    user_id: user.id,
    mode: payload.mode,
    total_questions: payload.total,
    correct_count: payload.correct,
    wrong_count: payload.wrong,
    skipped_count: payload.skipped,
    score_percent: Number(score.toFixed(2)),
    seconds_spent: payload.seconds,
    completed_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[quiz] Falha ao guardar sessão no servidor:", error.message);
  }
}
