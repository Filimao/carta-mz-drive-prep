import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PdfImportPanel } from "@/components/admin/PdfImportPanel";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_ORDER, PLANS, type PlanTier } from "@/lib/plans";
import { fetchCategories } from "@/lib/quiz";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Painel de administração — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Painel restrito a administradores para revisão de questões importadas, criação de novas questões e gestão de utilizadores e planos.",
      },
      { property: "og:title", content: "Painel de administração — Carta MZ Quiz" },
      {
        property: "og:description",
        content: "Gestão de questões, revisões, utilizadores e planos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

type Tab = "resumo" | "revisao" | "importar" | "nova" | "utilizadores";

interface AdminQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  tip: string | null;
  category_id: string | null;
  difficulty: "facil" | "medio" | "dificil";
  source_document: string | null;
  source_page: number | null;
  image_url: string | null;
  needs_review: boolean;
  is_published: boolean;
  is_verified: boolean;
}

const TABS: [Tab, string][] = [
  ["resumo", "Resumo"],
  ["revisao", "Questões"],
  ["importar", "Importar PDF"],
  ["nova", "Nova questão"],
  ["utilizadores", "Utilizadores"],
];

function Admin() {
  const session = useSession();
  const [tab, setTab] = useState<Tab>("resumo");
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handleImageUpload = async (questionId: string, file: File) => {
    setUploadingId(questionId);
    try {
      const url = await uploadQuestionImage(file);
      if (url) {
        toast.success("Imagem enviada com sucesso.");
        // Refresh questions list
        window.location.reload();
      } else {
        toast.error("Falha ao enviar imagem.");
      }
    } catch {
      toast.error("Falha ao enviar imagem.");
    } finally {
      setUploadingId(null);
    }
  };

  if (session.loading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">A verificar permissões...</p>
      </AppShell>
    );
  }

  if (!session.isAdmin) {
    return (
      <AppShell>
        <div className="surface mx-auto max-w-md rounded-3xl p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta área é exclusiva para administradores da plataforma.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Voltar ao início
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Painel de administração</h1>
        <Link to="/admin/pagamentos" className="text-sm font-semibold text-primary">
          Ir para pagamentos
        </Link>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
              tab === key ? "border-primary bg-primary/10 text-primary" : "border-border"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "resumo" && <OverviewPanel />}
      {tab === "revisao" && <ReviewPanel />}
      {tab === "importar" && <PdfImportPanel />}
      {tab === "nova" && <NewQuestionPanel />}
      {tab === "utilizadores" && <UsersPanel />}
    </AppShell>
  );
}

/* ---------------- Resumo ---------------- */

function OverviewPanel() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const count = async (build: () => PromiseLike<{ count: number | null }>) =>
        (await build()).count ?? 0;
      const [total, published, review, pdf, users, pro, premium, pending, sessions] =
        await Promise.all([
          count(() => supabase.from("questions").select("id", { count: "exact", head: true })),
          count(() =>
            supabase
              .from("questions")
              .select("id", { count: "exact", head: true })
              .eq("is_published", true),
          ),
          count(() =>
            supabase
              .from("questions")
              .select("id", { count: "exact", head: true })
              .eq("needs_review", true),
          ),
          count(() =>
            supabase.from("questions").select("id", { count: "exact", head: true }).eq("source", "PDF"),
          ),
          count(() => supabase.from("profiles").select("id", { count: "exact", head: true })),
          count(() =>
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("plan", "pro"),
          ),
          count(() =>
            supabase
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .eq("plan", "premium"),
          ),
          count(() =>
            supabase
              .from("subscription_requests")
              .select("id", { count: "exact", head: true })
              .eq("status", "pendente"),
          ),
          count(() => supabase.from("quiz_sessions").select("id", { count: "exact", head: true })),
        ]);
      return { total, published, review, pdf, users, pro, premium, pending, sessions };
    },
  });

  const cards: [string, number | string][] = [
    ["Total de questões", data?.total ?? 0],
    ["Publicadas", data?.published ?? 0],
    ["A precisar de revisão", data?.review ?? 0],
    ["Importadas de PDF", data?.pdf ?? 0],
    ["Utilizadores registados", data?.users ?? 0],
    ["Assinantes Pro", data?.pro ?? 0],
    ["Assinantes Premium", data?.premium ?? 0],
    ["Pagamentos pendentes", data?.pending ?? 0],
    ["Sessões realizadas", data?.sessions ?? 0],
  ];

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(([label, value]) => (
        <div key={label} className="surface rounded-2xl p-4">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold">{value}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Questões ---------------- */

type QFilter = "revisao" | "todas" | "despublicadas";

function ReviewPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<QFilter>("revisao");
  const [term, setTerm] = useState("");
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["admin-questions", filter, term],
    queryFn: async () => {
      let q = supabase
        .from("questions")
        .select(
          "id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,tip,category_id,difficulty,source_document,source_page,image_url,needs_review,is_published,is_verified",
        )
        .order("created_at", { ascending: false })
        .limit(80);
      if (filter === "revisao") q = q.eq("needs_review", true);
      if (filter === "despublicadas") q = q.eq("is_published", false);
      if (term.trim()) q = q.ilike("question_text", `%${term.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AdminQuestion[];
    },
  });

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["admin-questions"] });
    await qc.invalidateQueries({ queryKey: ["admin-overview"] });
  }

  async function update(id: string, patch: Partial<AdminQuestion>) {
    const { error } = await supabase.from("questions").update(patch).eq("id", id);
    if (error) {
      toast.error("Sem permissão ou erro ao guardar.");
      return;
    }
    await refresh();
    toast.success("Questão actualizada.");
  }

  async function remove(id: string) {
    if (!window.confirm("Eliminar esta questão definitivamente?")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível eliminar. Pode ter respostas associadas.");
      return;
    }
    await refresh();
    toast.success("Questão eliminada.");
  }

  async function approveAllVisible() {
    const ids = (questions ?? []).map((q) => q.id);
    if (ids.length === 0) return;
    if (!window.confirm(`Aprovar e publicar ${ids.length} questões visíveis?`)) return;
    const { error } = await supabase
      .from("questions")
      .update({ needs_review: false, is_verified: true, is_published: true })
      .in("id", ids);
    if (error) {
      toast.error("Não foi possível aprovar em lote.");
      return;
    }
    await refresh();
    toast.success(`${ids.length} questões aprovadas.`);
  }

  async function deleteAllQuestions() {
    const confirmation = window.prompt(
      "Esta ação apaga TODAS as questões. Escreve APAGAR para confirmar.",
    );
    if (confirmation !== "APAGAR") return;
    const { error } = await supabase.from("questions").delete().not("id", "is", null);
    if (error) {
      toast.error("Não foi possível apagar as questões.");
      return;
    }
    await refresh();
    toast.success("Todas as questões foram apagadas.");
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void deleteAllQuestions()}
          className="ml-auto rounded-xl border border-destructive/50 px-4 py-2 text-sm font-semibold text-destructive"
        >
          Apagar todas as questões
        </button>
        {(
          [
            ["revisao", "Para revisão"],
            ["despublicadas", "Despublicadas"],
            ["todas", "Todas"],
          ] as [QFilter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
              filter === key ? "border-primary bg-primary/10 text-primary" : "border-border"
            }`}
          >
            {label}
          </button>
        ))}
        <label className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Pesquisar pergunta..."
            className="w-full rounded-xl border border-input bg-card py-2.5 pl-9 pr-3 text-sm"
          />
        </label>
      </div>

      {filter === "revisao" && (questions ?? []).length > 0 && (
        <button
          type="button"
          onClick={() => void approveAllVisible()}
          className="rounded-xl border border-primary/50 px-4 py-2 text-sm font-semibold text-primary"
        >
          Aprovar todas as visíveis ({(questions ?? []).length})
        </button>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface h-40 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(questions ?? []).map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              categories={categories ?? []}
              onUpdate={update}
              onDelete={remove}
            />
          ))}
          {(questions ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nada por aqui. Bom trabalho!</p>
          )}
        </div>
      )}
    </div>
  );
}

interface CategoryOption {
  id: string;
  name: string;
  emoji: string;
}

function QuestionCard({
  question,
  categories,
  onUpdate,
  onDelete,
}: {
  question: AdminQuestion;
  categories: CategoryOption[];
  onUpdate: (id: string, patch: Partial<AdminQuestion>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState(question);

  const field = (key: keyof AdminQuestion, label: string) => (
    <label className="block text-xs font-semibold text-muted-foreground">
      {label}
      <input
        value={String(form[key] ?? "")}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="mt-1 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm font-normal text-foreground"
      />
    </label>
  );

  return (
    <div className="surface rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {question.needs_review && (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-semibold text-destructive">
            <AlertTriangle className="h-3 w-3" /> revisão
          </span>
        )}
        {question.is_verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
            <CheckCircle2 className="h-3 w-3" /> verificada
          </span>
        )}
        {!question.is_published && (
          <span className="rounded-full bg-muted px-2 py-0.5 font-semibold text-muted-foreground">
            despublicada
          </span>
        )}
        <span className="text-muted-foreground">
          {question.source_document ?? "—"}
          {question.source_page ? ` · p.${question.source_page}` : ""}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {field("question_text", "Pergunta")}
        {question.image_url && (
          <img
            src={question.image_url}
            alt="Imagem da questão"
            className="max-h-48 w-full rounded-xl border border-border bg-white object-contain"
          />
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id={`admin-upload-${question.id}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(question.id, file);
          }}
        />
        <label
          htmlFor={`admin-upload-${question.id}`}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold transition-colors hover:bg-secondary"
        >
          <Upload className="h-4 w-4" />
          {uploadingId === question.id ? "A enviar..." : "Enviar imagem"}
        </label>
        <ImagePromptHelper
          questionText={question.question_text}
          categoryName={categories.find((c) => c.id === question.category_id)?.name}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {field("option_a", "Opção A")}
          {field("option_b", "Opção B")}
          {field("option_c", "Opção C")}
          {field("option_d", "Opção D")}
        </div>
        {field("explanation", "Explicação")}
        {field("tip", "Dica")}
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block text-xs font-semibold text-muted-foreground">
            Resposta correcta
            <select
              value={form.correct_answer}
              onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
              className="mt-1 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm font-normal text-foreground"
            >
              {["A", "B", "C", "D"].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted-foreground">
            Dificuldade
            <select
              value={form.difficulty}
              onChange={(e) =>
                setForm({ ...form, difficulty: e.target.value as AdminQuestion["difficulty"] })
              }
              className="mt-1 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm font-normal text-foreground"
            >
              <option value="facil">Fácil</option>
              <option value="medio">Médio</option>
              <option value="dificil">Difícil</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted-foreground">
            Categoria
            <select
              value={form.category_id ?? ""}
              onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
              className="mt-1 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm font-normal text-foreground"
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            void onUpdate(question.id, {
              question_text: form.question_text,
              option_a: form.option_a,
              option_b: form.option_b,
              option_c: form.option_c,
              option_d: form.option_d,
              explanation: form.explanation,
              tip: form.tip,
              category_id: form.category_id,
              difficulty: form.difficulty,
              correct_answer: form.correct_answer,
              needs_review: false,
              is_verified: true,
              is_published: true,
            })
          }
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Aprovar e publicar
        </button>
        <button
          type="button"
          onClick={() =>
            void onUpdate(question.id, { is_published: !question.is_published })
          }
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
        >
          {question.is_published ? "Despublicar" : "Publicar"}
        </button>
        <button
          type="button"
          onClick={() => void onUpdate(question.id, { needs_review: !question.needs_review })}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
        >
          {question.needs_review ? "Sem dúvidas" : "Marcar para revisão"}
        </button>
        <button
          type="button"
          onClick={() => void onDelete(question.id)}
          className="inline-flex items-center gap-2 rounded-xl border border-destructive/50 px-4 py-2 text-sm font-semibold text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Eliminar
        </button>
      </div>
    </div>
  );
}

/* ---------------- Nova questão ---------------- */

const EMPTY_NEW = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "A",
  explanation: "",
  tip: "",
  category_id: "",
  difficulty: "medio" as AdminQuestion["difficulty"],
};

function NewQuestionPanel() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_NEW);
  const [saving, setSaving] = useState(false);
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const valid =
    form.question_text.trim().length > 10 &&
    [form.option_a, form.option_b, form.option_c, form.option_d].every((o) => o.trim().length > 0) &&
    form.explanation.trim().length > 5;

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("questions").insert({
      question_text: form.question_text.trim(),
      option_a: form.option_a.trim(),
      option_b: form.option_b.trim(),
      option_c: form.option_c.trim(),
      option_d: form.option_d.trim(),
      correct_answer: form.correct_answer,
      explanation: form.explanation.trim(),
      tip: form.tip.trim() || null,
      category_id: form.category_id || null,
      difficulty: form.difficulty,
      source: "AUTHORED",
      is_published: true,
      is_verified: true,
      needs_review: false,
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível criar a questão.");
      return;
    }
    setForm(EMPTY_NEW);
    await qc.invalidateQueries({ queryKey: ["admin-questions"] });
    await qc.invalidateQueries({ queryKey: ["admin-overview"] });
    toast.success("Questão criada e publicada!");
  }

  const input = (key: keyof typeof EMPTY_NEW, label: string) => (
    <label className="block text-xs font-semibold text-muted-foreground">
      {label}
      <input
        value={String(form[key] ?? "")}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="mt-1 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm font-normal text-foreground"
      />
    </label>
  );

  return (
    <div className="surface mt-6 space-y-3 rounded-2xl p-5">
      <h2 className="font-display text-lg font-semibold">Criar questão</h2>
      {input("question_text", "Pergunta")}
      <div className="grid gap-2 sm:grid-cols-2">
        {input("option_a", "Opção A")}
        {input("option_b", "Opção B")}
        {input("option_c", "Opção C")}
        {input("option_d", "Opção D")}
      </div>
      {input("explanation", "Explicação")}
      {input("tip", "Dica (opcional)")}
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block text-xs font-semibold text-muted-foreground">
          Resposta correcta
          <select
            value={form.correct_answer}
            onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
            className="mt-1 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm font-normal text-foreground"
          >
            {["A", "B", "C", "D"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted-foreground">
          Dificuldade
          <select
            value={form.difficulty}
            onChange={(e) =>
              setForm({ ...form, difficulty: e.target.value as AdminQuestion["difficulty"] })
            }
            className="mt-1 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm font-normal text-foreground"
          >
            <option value="facil">Fácil</option>
            <option value="medio">Médio</option>
            <option value="dificil">Difícil</option>
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted-foreground">
          Categoria
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="mt-1 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm font-normal text-foreground"
          >
            <option value="">Sem categoria</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        disabled={!valid || saving}
        onClick={() => void save()}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        <Plus className="h-4 w-4" /> {saving ? "A guardar..." : "Criar questão"}
      </button>
    </div>
  );
}

/* ---------------- Utilizadores ---------------- */

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  plan: PlanTier;
  plan_expires_at: string | null;
  xp: number;
  streak_days: number;
}

function UsersPanel() {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,phone,plan,plan_expires_at,xp,streak_days")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const { data: admins } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.user_id));
    },
  });

  const list = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return profiles ?? [];
    return (profiles ?? []).filter(
      (p) =>
        (p.full_name ?? "").toLowerCase().includes(t) ||
        (p.phone ?? "").includes(t) ||
        p.id.startsWith(t),
    );
  }, [profiles, term]);

  async function setPlan(id: string, plan: PlanTier) {
    setBusy(id);
    const expires =
      plan === "free" ? null : new Date(Date.now() + 30 * 864e5).toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({ plan, plan_expires_at: expires })
      .eq("id", id);
    setBusy(null);
    if (error) {
      toast.error("Não foi possível alterar o plano.");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    toast.success(
      plan === "free" ? "Utilizador voltou ao plano Free." : `Plano ${PLANS[plan].name} activo por 30 dias.`,
    );
  }

  async function toggleAdmin(id: string, isAdmin: boolean) {
    setBusy(id);
    const { error } = isAdmin
      ? await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin")
      : await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
    setBusy(null);
    if (error) {
      toast.error("Não foi possível alterar as permissões.");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["admin-roles"] });
    toast.success(isAdmin ? "Permissões de admin removidas." : "Novo administrador!");
  }

  return (
    <div className="mt-6 space-y-4">
      <label className="relative block w-full sm:w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Pesquisar por nome ou telefone..."
          className="w-full rounded-xl border border-input bg-card py-2.5 pl-9 pr-3 text-sm"
        />
      </label>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface h-20 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((p) => {
            const isAdmin = admins?.has(p.id) ?? false;
            return (
              <li
                key={p.id}
                className="surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
              >
                <div className="text-sm">
                  <p className="font-semibold">
                    {p.full_name ?? "Sem nome"}{" "}
                    {isAdmin && (
                      <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        <ShieldCheck className="h-3 w-3" /> admin
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.phone ?? "sem telefone"} · {PLANS[p.plan]?.name ?? p.plan}
                    {p.plan_expires_at
                      ? ` até ${new Date(p.plan_expires_at).toLocaleDateString("pt-PT")}`
                      : ""}{" "}
                    · {p.xp} XP · {p.streak_days} dias seguidos
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={p.plan}
                    disabled={busy === p.id}
                    onChange={(e) => void setPlan(p.id, e.target.value as PlanTier)}
                    className="rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold"
                  >
                    {PLAN_ORDER.map((t) => (
                      <option key={t} value={t}>
                        {PLANS[t].name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => void toggleAdmin(p.id, isAdmin)}
                    className="rounded-xl border border-border px-3 py-2 text-sm font-semibold disabled:opacity-60"
                  >
                    {isAdmin ? "Remover admin" : "Tornar admin"}
                  </button>
                </div>
              </li>
            );
          })}
          {list.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum utilizador encontrado.</p>
          )}
        </ul>
      )}
    </div>
  );
}
