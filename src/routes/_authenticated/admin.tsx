import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, type PlanTier } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel de administração — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Painel restrito a administradores para revisão de questões importadas e gestão de subscrições.",
      },
      { property: "og:title", content: "Painel de administração — Carta MZ Quiz" },
      { property: "og:description", content: "Gestão de questões, revisões e planos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

type Tab = "revisao" | "subscricoes";

interface AdminQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  source_document: string | null;
  source_page: number | null;
  needs_review: boolean;
  is_published: boolean;
  is_verified: boolean;
}

function Admin() {
  const session = useSession();
  const [tab, setTab] = useState<Tab>("revisao");

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
      <h1 className="font-display text-3xl font-semibold">Painel de administração</h1>
      <div className="mt-5 flex gap-2">
        {(
          [
            ["revisao", "Revisão de questões"],
            ["subscricoes", "Subscrições"],
          ] as const
        ).map(([key, label]) => (
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
      {tab === "revisao" ? <ReviewPanel /> : <SubscriptionsPanel />}
    </AppShell>
  );
}

function ReviewPanel() {
  const qc = useQueryClient();
  const [onlyReview, setOnlyReview] = useState(true);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const total = await supabase.from("questions").select("id", { count: "exact", head: true });
      const review = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("needs_review", true);
      const pdf = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("source", "PDF");
      return { total: total.count ?? 0, review: review.count ?? 0, pdf: pdf.count ?? 0 };
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["admin-questions", onlyReview],
    queryFn: async () => {
      let q = supabase
        .from("questions")
        .select(
          "id,question_text,option_a,option_b,option_c,option_d,correct_answer,source_document,source_page,needs_review,is_published,is_verified",
        )
        .order("created_at", { ascending: false })
        .limit(60);
      if (onlyReview) q = q.eq("needs_review", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AdminQuestion[];
    },
  });

  async function update(id: string, patch: Partial<AdminQuestion>) {
    const { error } = await supabase.from("questions").update(patch).eq("id", id);
    if (error) {
      toast.error("Sem permissão ou erro ao guardar.");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["admin-questions"] });
    await qc.invalidateQueries({ queryKey: ["admin-stats"] });
    toast.success("Questão actualizada.");
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Total de questões", stats?.total ?? 0],
          ["Importadas de PDF", stats?.pdf ?? 0],
          ["A precisar de revisão", stats?.review ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="surface rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={onlyReview}
          onChange={(e) => setOnlyReview(e.target.checked)}
          className="h-4 w-4"
        />
        Mostrar apenas questões marcadas para revisão
      </label>

      <div className="space-y-4">
        {(questions ?? []).map((q) => (
          <QuestionCard key={q.id} question={q} onUpdate={update} />
        ))}
        {(questions ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nada por revisar. Bom trabalho!</p>
        )}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  onUpdate,
}: {
  question: AdminQuestion;
  onUpdate: (id: string, patch: Partial<AdminQuestion>) => Promise<void>;
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
        <span className="text-muted-foreground">
          {question.source_document ?? "—"}
          {question.source_page ? ` · p.${question.source_page}` : ""}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {field("question_text", "Pergunta")}
        <div className="grid gap-2 sm:grid-cols-2">
          {field("option_a", "Opção A")}
          {field("option_b", "Opção B")}
          {field("option_c", "Opção C")}
          {field("option_d", "Opção D")}
        </div>
        <label className="block text-xs font-semibold text-muted-foreground">
          Resposta correcta
          <select
            value={form.correct_answer}
            onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
            className="mt-1 w-full rounded-lg border border-input bg-card px-2.5 py-2 text-sm font-normal text-foreground sm:w-32"
          >
            {["A", "B", "C", "D"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
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
          onClick={() => void onUpdate(question.id, { needs_review: true, is_published: false })}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
        >
          Despublicar
        </button>
      </div>
    </div>
  );
}

function SubscriptionsPanel() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_requests")
        .select("id,user_id,plan,amount_mzn,payment_reference,status,created_at")
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function decide(id: string, userId: string, plan: PlanTier, approve: boolean) {
    const { error } = await supabase
      .from("subscription_requests")
      .update({ status: approve ? "aprovado" : "rejeitado", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível actualizar o pedido.");
      return;
    }
    if (approve) {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      await supabase
        .from("profiles")
        .update({ plan, plan_expires_at: expires.toISOString() })
        .eq("id", userId);
    }
    await qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    toast.success(approve ? "Plano activado por 30 dias." : "Pedido rejeitado.");
  }

  return (
    <div className="mt-6 space-y-3">
      {(data ?? []).map((r) => (
        <div key={r.id} className="surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
          <div className="text-sm">
            <p className="font-semibold">
              {PLANS[r.plan as PlanTier].name} · {r.amount_mzn} MT ·{" "}
              <span className="text-muted-foreground">{r.status}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Ref.: {r.payment_reference ?? "—"} · utilizador {r.user_id.slice(0, 8)} ·{" "}
              {new Date(r.created_at).toLocaleDateString("pt-PT")}
            </p>
          </div>
          {r.status === "pendente" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void decide(r.id, r.user_id, r.plan as PlanTier, true)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Aprovar
              </button>
              <button
                type="button"
                onClick={() => void decide(r.id, r.user_id, r.plan as PlanTier, false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
              >
                Rejeitar
              </button>
            </div>
          )}
        </div>
      ))}
      {(data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">Sem pedidos de subscrição.</p>
      )}
    </div>
  );
}
