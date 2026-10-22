import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { MiniTest } from "@/components/MiniTest";
import { trackProductEvent } from "@/lib/product-analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mini-teste grátis — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Experimente 10 questões publicadas para o exame teórico de condução em Moçambique, sem criar conta.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/icon-512.png" },
      { property: "og:title", content: "Mini-teste grátis de condução | Carta MZ Quiz" },
      {
        property: "og:description",
        content:
          "Responda a 10 questões, veja as explicações e conheça a plataforma sem iniciar sessão.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/icon-512.png" },
      { name: "twitter:title", content: "Mini-teste grátis — Carta MZ Quiz" },
      {
        name: "twitter:description",
        content: "Experimente questões publicadas para o exame teórico em Moçambique.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => trackProductEvent("landing_page_view"), []);

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl space-y-6 py-4 sm:py-8">
        <header>
          <p className="text-sm font-semibold text-primary">Carta MZ Quiz</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            Mini-teste grátis para a carta de condução
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Experimente 10 questões publicadas para o exame teórico em Moçambique. Responda sem
            criar conta e veja o feedback e as explicações.
          </p>
        </header>
        <MiniTest />
        <p className="text-center text-sm text-muted-foreground">
          Quer praticar por tema e acompanhar o seu progresso?{" "}
          <Link
            to="/auth"
            onClick={() => trackProductEvent("create_account_click")}
            className="font-semibold text-primary hover:underline"
          >
            Crie uma conta
          </Link>{" "}
          ou{" "}
          <Link to="/precos" className="font-semibold text-primary hover:underline">
            consulte os planos
          </Link>
          .
        </p>
      </section>
    </AppShell>
  );
}
