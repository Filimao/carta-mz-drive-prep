import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { fetchCategories } from "@/lib/quiz";
import { generateSymbols, generateSymbolImagePrompt } from "@/lib/symbols.functions";

interface StoredSymbol {
  id: string;
  name: string;
  description: string;
  category_id: string | null;
  image_prompt: string;
  image_url: string | null;
  ai_generated: boolean;
}

interface GeneratedSymbol {
  name: string;
  description: string;
  categorySlug: string | null;
  imagePrompt?: string;
}

export function SymbolsPanel() {
  const qc = useQueryClient();
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const [activeCat, setActiveCat] = useState<string>("todos");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedSymbol[]>([]);
  const [stored, setStored] = useState<StoredSymbol[]>([]);

  async function loadStored() {
    const sb = supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (
            c: string,
            v: unknown,
          ) => {
            order: (
              c: string,
              o: { ascending: boolean },
            ) => {
              limit: (n: number) => Promise<{ data?: unknown; error?: unknown }>;
            };
          };
        };
      };
    };
    const result = (await sb
      .from("symbols")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(100)) as { data?: StoredSymbol[]; error?: unknown };
    if (result.error) return;
    setStored((result.data ?? []) as StoredSymbol[]);
  }

  useEffect(() => {
    void loadStored();
  }, []);

  const filtered =
    activeCat === "todos" ? stored : stored.filter((s) => s.category_id === categories?.find((c) => c.slug === activeCat)?.id);

  async function generateAI() {
    setGenerating(true);
    try {
      const result = (await generateSymbols({
        data: { category_slug: activeCat === "todos" ? null : activeCat, count: 8 },
      })) as { symbols?: GeneratedSymbol[] };
      const symbols = result.symbols ?? [];
      const withPromises = symbols.map(async (s) => {
        const cat = categories?.find((c) => c.slug === s.categorySlug);
        let imagePrompt = "";
        try {
          const img = (await generateSymbolImagePrompt({
            data: { symbol_name: s.name, category_name: cat?.name ?? null },
          })) as { prompt: string };
          imagePrompt = img.prompt;
        } catch {
          imagePrompt = "";
        }
        return { ...s, imagePrompt };
      });
      const resolved = await Promise.all(withPromises);
      setGenerated(resolved);
      toast.success(`${resolved.length} símbolos gerados por IA.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar símbolos.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveGenerated() {
    if (generated.length === 0) return;
    try {
      const rows = generated.map((s) => ({
        name: s.name,
        description: s.description,
        category_id: categories?.find((c) => c.slug === s.categorySlug)?.id ?? null,
        image_prompt: s.imagePrompt ?? "",
        ai_generated: true,
      }));
      const sb = supabase as unknown as {
        from: (t: string) => {
          insert: (r: unknown[]) => Promise<{ error?: unknown }>;
        };
      };
      const { error } = await sb.from("symbols").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} símbolos guardados.`);
      setGenerated([]);
      await loadStored();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao guardar.");
    }
  }

  async function deleteSymbol(id: string) {
    const sb = supabase as unknown as {
      from: (t: string) => {
        delete: () => {
          eq: (
            c: string,
            v: unknown,
          ) => Promise<{ error?: unknown }>;
        };
      };
    };
    const { error } = await sb.from("symbols").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível eliminar.");
      return;
    }
    await loadStored();
    toast.success("Símbolo eliminado.");
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Símbolos de Trânsito</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeCat}
            onChange={(e) => setActiveCat(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold"
            aria-label="Filtrar por categoria"
          >
            <option value="todos">Todas as categorias</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={generating}
            onClick={() => void generateAI()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "A gerar..." : "Gerar com IA"}
          </button>
        </div>
      </div>

      {generated.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-primary">
              {generated.length} símbolos gerados (por guardar)
            </p>
            <button
              type="button"
              onClick={() => void saveGenerated()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Guardar todos
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {generated.map((s, i) => (
              <div
                key={`gen-${i}`}
                className="surface rounded-2xl p-4 border border-primary/20 relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-primary">{s.name}</h3>
                  <button
                    type="button"
                    onClick={() => setGenerated((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-white/70 leading-relaxed">{s.description}</p>
                {s.imagePrompt && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[10px] text-primary hover:underline">
                      Prompt IA
                    </summary>
                    <p className="mt-1 text-[10px] text-white/50 leading-relaxed bg-white/5 rounded-lg p-2">
                      {s.imagePrompt}
                    </p>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && !generating ? (
        <div className="surface rounded-2xl p-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum símbolo encontrado.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Clique em "Gerar com IA" para criar símbolos automaticamente.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <SymbolCard
              key={s.id}
              symbol={s}
              categories={categories ?? []}
              onDelete={() => void deleteSymbol(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SymbolCard({
  symbol,
  categories,
  onDelete,
}: {
  symbol: StoredSymbol;
  categories: { slug: string; name: string }[];
  onDelete: () => void;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const catName = categories.find((c) => c.slug === symbol.category_id)?.name;

  return (
    <div className="surface rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-bold">{symbol.name}</h3>
          {symbol.ai_generated && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
              <Sparkles className="h-2.5 w-2.5" /> IA
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {symbol.image_url && (
        <div className="mt-3 rounded-xl overflow-hidden border border-white/10 bg-white/5">
          <img
            src={symbol.image_url}
            alt={symbol.name}
            className="h-32 w-full object-contain p-2"
          />
        </div>
      )}
      <p className="mt-2 text-xs text-white/70 leading-relaxed">{symbol.description}</p>
      {catName && (
        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {catName}
        </p>
      )}
      {symbol.image_prompt && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowPrompt(!showPrompt)}
            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
          >
            Ver prompt IA
          </button>
          {showPrompt && (
            <p className="mt-1 text-[10px] text-white/50 leading-relaxed bg-white/5 rounded-lg p-2">
              {symbol.image_prompt}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
