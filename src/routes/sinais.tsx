import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Signpost } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ZoomableImage } from "@/components/quiz/ZoomableImage";
import { Button } from "@/components/ui/button";
import { BASIC_SIGNS } from "@/lib/signs";
import { fetchPublicSigns } from "@/lib/signs.functions";

const catalogQuery = queryOptions({ queryKey: ["public-signs"], queryFn: () => fetchPublicSigns(), staleTime: 60_000 });
export const Route = createFileRoute("/sinais")({
  head: () => ({ meta: [
    { title: "Sinais de trânsito — Carta MZ Quiz" },
    { name: "description", content: "Consulte sinais de trânsito em Moçambique, pesquise por categoria e aprenda o significado de cada sinal." },
    { property: "og:title", content: "Sinais de trânsito em Moçambique — Carta MZ Quiz" },
    { property: "og:description", content: "Catálogo pesquisável de sinais de trânsito em Moçambique e os seus significados." },
    { property: "og:type", content: "website" },
    { property: "og:image", content: "/icon-512.png" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: "/icon-512.png" },
    { name: "twitter:title", content: "Sinais de trânsito em Moçambique — Carta MZ Quiz" },
    { name: "twitter:description", content: "Catálogo visual pesquisável de sinais de trânsito e significados." },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Signs,
});
function Signs() {
  const { data } = useSuspenseQuery(catalogQuery);
  const [term, setTerm] = useState("");
  const [group, setGroup] = useState("Todos");
  const signs = [...BASIC_SIGNS, ...data.map((s) => ({ ...s, group: "Outros" }))];
  const filtered = signs.filter((s) => (group === "Todos" || s.group === group) && `${s.name} ${s.description}`.toLocaleLowerCase("pt").includes(term.toLocaleLowerCase("pt")));
  return <AppShell>
    <div className="flex items-center gap-3"><Signpost className="h-7 w-7 text-primary" /><h1 className="font-display text-3xl font-semibold">Sinais de trânsito</h1></div>
    <div className="my-6 flex flex-wrap items-center gap-3">
      <label className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input aria-label="Pesquisar sinais" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Pesquisar sinal..." className="h-10 w-full rounded-md border border-input bg-card pl-10 pr-3 text-sm" /></label>
      <div className="flex flex-wrap gap-2">{["Todos", "Prioridade", "Proibição", "Outros"].map((g) => <Button key={g} variant={group === g ? "default" : "outline"} aria-pressed={group === g} onClick={() => setGroup(g)}>{g}</Button>)}</div>
    </div>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((s) => <article key={s.id} className="rounded-lg border border-border bg-card p-5">
      {s.image_url ? <ZoomableImage src={s.image_url} alt={s.name} /> : <Signpost className="my-8 h-16 w-full text-muted-foreground" />}
      <p className="text-xs text-muted-foreground">{s.group}</p><h2 className="mt-1 font-display text-lg font-semibold">{s.name}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
    </article>)}</div>
    {!filtered.length && <p className="py-10 text-center text-muted-foreground">Nenhum sinal encontrado.</p>}
  </AppShell>;
}