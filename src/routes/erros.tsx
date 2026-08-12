import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { QuizEngine } from "@/components/QuizEngine";
import { readLocal } from "@/lib/quiz";

export const Route = createFileRoute("/erros")({
  head: () => ({
    meta: [
      { title: "Treinar os meus erros — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Revise apenas as questões que respondeu incorrectamente, com repetição espaçada para fixar a matéria.",
      },
      { property: "og:title", content: "Treinar os meus erros — Carta MZ Quiz" },
      {
        property: "og:description",
        content: "Um quiz gerado automaticamente a partir dos seus pontos fracos.",
      },
    ],
  }),
  component: Erros,
});

function Erros() {
  const [ids, setIds] = useState<string[] | null>(null);

  useEffect(() => {
    setIds(
      readLocal()
        .answers.filter((a) => !a.correct)
        .map((a) => a.questionId),
    );
  }, []);

  if (ids === null) return <AppShell>{null}</AppShell>;

  if (ids.length === 0) {
    return (
      <AppShell>
        <h1 className="font-display text-3xl font-semibold">Modo Erros</h1>
        <div className="surface mt-6 rounded-3xl p-8 text-center">
          <p className="font-semibold">Ainda não tem questões erradas registadas.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Faça um quiz e as questões falhadas aparecem aqui automaticamente.
          </p>
          <Link
            to="/praticar"
            className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Começar a praticar
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <QuizEngine
        mode="erros"
        title="Treinar os meus erros"
        config={{ count: Math.min(ids.length, 30), ids }}
      />
    </AppShell>
  );
}
