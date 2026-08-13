import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { QuizEngine } from "@/components/QuizEngine";
import { readLocal } from "@/lib/quiz";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Questões marcadas — Carta MZ Quiz" },
      {
        name: "description",
        content: "Reveja as questões que marcou como favoritas para estudar mais tarde.",
      },
      { property: "og:title", content: "Questões marcadas — Carta MZ Quiz" },
      {
        property: "og:description",
        content: "A sua lista pessoal de questões para revisão.",
      },
    ],
  }),
  component: Favoritos,
});

function Favoritos() {
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => setIds(readLocal().favorites), []);

  if (ids === null) return <AppShell>{null}</AppShell>;

  if (ids.length === 0) {
    return (
      <AppShell>
        <h1 className="font-display text-3xl font-semibold">Favoritos</h1>
        <div className="surface mt-6 rounded-3xl p-8 text-center">
          <p className="font-semibold">Ainda não marcou nenhuma questão.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Durante um quiz, toque na estrela para guardar a questão aqui.
          </p>
          <Link
            to="/praticar"
            className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Ir praticar
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <QuizEngine
        mode="favoritos"
        title="Questões marcadas"
        config={{ count: Math.min(ids.length, 50), ids }}
      />
    </AppShell>
  );
}
