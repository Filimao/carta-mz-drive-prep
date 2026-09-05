import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { ExtractedQuestion } from "@/lib/pdf-import.functions";
import { extractQuestionsFromPage, saveImportedQuestions } from "@/lib/pdf-import.functions";
import { fetchCategories } from "@/lib/quiz";

type Draft = ExtractedQuestion & { key: string; page: number; category_id: string | null };

const LETTERS = ["A", "B", "C", "D"] as const;

/** Carrega o pdfjs apenas no browser e configura o worker. */
async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

export function PdfImportPanel() {
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const [file, setFile] = useState<File | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [failedPages, setFailedPages] = useState<number[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "running" | "paused" | "done" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pausedRef = useRef(false);
  const docRef = useRef<Awaited<ReturnType<Awaited<ReturnType<typeof loadPdfjs>>["getDocument"]>["promise"]> | null>(
    null,
  );

  const catList = (categories ?? []).map((c) => ({ slug: c.slug, name: c.name }));

  const updateImportRow = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      await supabase.from("question_imports").update(patch).eq("id", id);
    },
    [],
  );

  /** Renderiza uma página em imagem + texto e envia para a IA. */
  const processPage = useCallback(
    async (pageNumber: number, imageFolder: string) => {
      const doc = docRef.current;
      if (!doc) throw new Error("PDF não carregado.");
      const page = await doc.getPage(pageNumber);
      // Higher resolution preserves small letters and the green answer marker.
      const viewport = page.getViewport({ scale: 3 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível preparar o canvas.");
      await page.render({ canvas, canvasContext: ctx, viewport } as never).promise;
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.92);
      const text = await page.getTextContent();
      const pageText = text.items
        .map((i) => ("str" in i ? i.str : ""))
        .join(" ")
        .trim();

      const result = await extractQuestionsFromPage({
        data: { imageBase64, pageText, page: pageNumber, categories: catList },
      });

      const found = await Promise.all(
        result.questions.map(async (q, i) => {
          let imageUrl = q.image_url;
          const region = q.image_region;
          if (region && region.width > 0 && region.height > 0) {
            const crop = document.createElement("canvas");
            const x = Math.max(0, Math.floor(region.x * canvas.width));
            const y = Math.max(0, Math.floor(region.y * canvas.height));
            const width = Math.min(canvas.width - x, Math.floor(region.width * canvas.width));
            const height = Math.min(canvas.height - y, Math.floor(region.height * canvas.height));
            if (width > 0 && height > 0) {
              crop.width = width;
              crop.height = height;
              crop.getContext("2d")?.drawImage(canvas, x, y, width, height, 0, 0, width, height);
              const blob = await new Promise<Blob | null>((resolve) =>
                crop.toBlob(resolve, "image/jpeg", 0.86),
              );
              if (blob) {
                const path = `${imageFolder}/${pageNumber}-${i}.jpg`;
                const upload = await supabase.storage.from("question-images").upload(path, blob, {
                  contentType: "image/jpeg",
                  upsert: true,
                });
                if (!upload.error) {
                  imageUrl = supabase.storage.from("question-images").getPublicUrl(path).data.publicUrl;
                }
              }
            }
          }
          return {
            ...q,
            image_url: imageUrl,
            key: `${pageNumber}-${i}-${Math.random().toString(36).slice(2, 7)}`,
            page: pageNumber,
            category_id:
              (categories ?? []).find((c) => c.slug === q.category_slug)?.id ?? null,
          };
        }),
      );
      setDrafts((prev) => [...prev, ...found]);
      return found.length;
    },
    [catList, categories],
  );

  const runPages = useCallback(
    async (pages: number[], id: string, imageFolder: string) => {
      setStatus("running");
      pausedRef.current = false;
      let done = processed;
      let found = drafts.length;
      const failures = new Set(failedPages);

      for (const pageNumber of pages) {
        if (pausedRef.current) {
          setStatus("paused");
          setMessage(`Importação em pausa na página ${pageNumber}.`);
          return;
        }
        try {
          found += await processPage(pageNumber, imageFolder);
          failures.delete(pageNumber);
        } catch (err) {
          failures.add(pageNumber);
          setMessage(err instanceof Error ? err.message : "Erro ao processar página.");
        }
        done += 1;
        setProcessed(done);
        setFailedPages([...failures].sort((a, b) => a - b));
        await updateImportRow(id, {
          processed_pages: done,
          questions_found: found,
          failed_pages: [...failures],
          status: "em_progresso",
        });
      }

      setStatus("done");
      setMessage(
        failures.size > 0
          ? `Concluído com ${failures.size} página(s) com erro. Podes reprocessar.`
          : "Todas as páginas foram processadas.",
      );
      await updateImportRow(id, { status: failures.size > 0 ? "com_erros" : "concluido" });
    },
    [drafts.length, failedPages, processed, processPage, updateImportRow],
  );

  async function startImport() {
    if (!file) return;
    try {
      setStatus("uploading");
      setMessage("A enviar o PDF...");
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Sessão expirada.");

      const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const up = await supabase.storage.from("question-pdfs").upload(path, file, {
        contentType: "application/pdf",
      });
      if (up.error) throw new Error(up.error.message);

      const buffer = await file.arrayBuffer();
      const pdfjs = await loadPdfjs();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
      docRef.current = doc;

      const row = await supabase
        .from("question_imports")
        .insert({
          created_by: userId,
          file_name: file.name,
          storage_path: path,
          total_pages: doc.numPages,
          status: "em_progresso",
        })
        .select("id")
        .single();
      if (row.error) throw new Error(row.error.message);

      setImportId(row.data.id);
      setStoragePath(path);
      setTotalPages(doc.numPages);
      setProcessed(0);
      setFailedPages([]);
      setDrafts([]);
      await runPages(
        Array.from({ length: doc.numPages }, (_, i) => i + 1),
        row.data.id,
        `${userId}/${row.data.id}`,
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Falha na importação.");
    }
  }

  async function resume() {
    if (!importId) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const remaining = Array.from({ length: totalPages }, (_, i) => i + 1).slice(processed);
    await runPages(remaining, importId, `${data.user.id}/${importId}`);
  }

  async function retryFailed() {
    if (!importId || failedPages.length === 0) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const pages = [...failedPages];
    setProcessed((p) => Math.max(0, p - pages.length));
    await runPages(pages, importId, `${data.user.id}/${importId}`);
  }

  async function publish() {
    if (!importId || drafts.length === 0) return;
    setSaving(true);
    try {
      const res = await saveImportedQuestions({
        data: {
          importId,
          sourceDocument: file?.name ?? storagePath ?? "PDF",
          questions: drafts.map(({ key: _key, ...q }) => q),
        },
      });
      toast.success(
        `${res.inserted} questões guardadas${res.needsReview > 0 ? ` (${res.needsReview} para revisão)` : ""}.`,
      );
      setDrafts([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível guardar.");
    } finally {
      setSaving(false);
    }
  }

  function patch(key: string, changes: Partial<Draft>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...changes } : d)));
  }

  const percent = totalPages > 0 ? Math.round((processed / totalPages) * 100) : 0;

  return (
    <section className="mt-6 space-y-6">
      <div className="surface rounded-2xl p-5">
        <h2 className="font-display text-lg font-semibold">Importar questões por PDF</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Envia um PDF (com texto ou digitalizado). Cada página é lida por IA e as questões com
          baixa confiança ficam marcadas como “Revisão necessária”.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm">
            <FileUp className="h-5 w-5 text-primary" />
            <span className="truncate">{file?.name ?? "Escolher ficheiro PDF"}</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            disabled={!file || status === "uploading" || status === "running"}
            onClick={() => void startImport()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {status === "uploading" || status === "running" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            Iniciar importação
          </button>
        </div>
      </div>

      {totalPages > 0 && (
        <div className="surface rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">
              Progresso: {processed}/{totalPages} páginas ({percent}%)
            </p>
            <div className="flex flex-wrap gap-2">
              {status === "running" ? (
                <button
                  type="button"
                  onClick={() => {
                    pausedRef.current = true;
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
                >
                  <Pause className="h-4 w-4" /> Pausar
                </button>
              ) : (
                processed < totalPages && (
                  <button
                    type="button"
                    onClick={() => void resume()}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
                  >
                    <Play className="h-4 w-4" /> Retomar
                  </button>
                )
              )}
              {failedPages.length > 0 && status !== "running" && (
                <button
                  type="button"
                  onClick={() => void retryFailed()}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
                >
                  <RefreshCw className="h-4 w-4" /> Reprocessar {failedPages.length} página(s)
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Páginas processadas" value={`${processed}`} icon={CheckCircle2} />
            <Stat label="Questões encontradas" value={`${drafts.length}`} icon={FileUp} />
            <Stat label="Páginas com erro" value={`${failedPages.length}`} icon={AlertTriangle} />
          </div>
          {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
        </div>
      )}

      {drafts.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-base font-semibold">
              Pré-visualização ({drafts.length})
            </h3>
            <button
              type="button"
              disabled={saving}
              onClick={() => void publish()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar e publicar
            </button>
          </div>

          {drafts.map((d) => (
            <article key={d.key} className="surface space-y-3 rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Página {d.page} · confiança {Math.round(d.confidence * 100)}%
                  {d.confidence < 0.75 && " · revisão necessária"}
                </span>
                <button
                  type="button"
                  onClick={() => setDrafts((prev) => prev.filter((x) => x.key !== d.key))}
                  className="inline-flex items-center gap-1 text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Remover
                </button>
              </div>
              <textarea
                value={d.question_text}
                onChange={(e) => patch(d.key, { question_text: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                {LETTERS.map((letter) => {
                  const field = `option_${letter.toLowerCase()}` as
                    | "option_a"
                    | "option_b"
                    | "option_c"
                    | "option_d";
                  return (
                    <label key={letter} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`correct-${d.key}`}
                        checked={d.correct_answer === letter}
                        onChange={() => patch(d.key, { correct_answer: letter })}
                        aria-label={`Marcar ${letter} como correcta`}
                      />
                      <span className="w-4 font-semibold">{letter}</span>
                      <input
                        value={d[field]}
                        onChange={(e) => patch(d.key, { [field]: e.target.value } as Partial<Draft>)}
                        className="flex-1 rounded-lg border border-input bg-card px-2 py-1.5 text-sm"
                      />
                    </label>
                  );
                })}
              </div>
              <textarea
                value={d.explanation}
                onChange={(e) => patch(d.key, { explanation: e.target.value })}
                rows={2}
                placeholder="Explicação"
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={d.category_id ?? ""}
                  onChange={(e) => patch(d.key, { category_id: e.target.value || null })}
                  className="rounded-xl border border-input bg-card px-3 py-2 text-sm"
                  aria-label="Categoria"
                >
                  <option value="">Sem categoria</option>
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={d.difficulty}
                  onChange={(e) =>
                    patch(d.key, { difficulty: e.target.value as Draft["difficulty"] })
                  }
                  className="rounded-xl border border-input bg-card px-3 py-2 text-sm"
                  aria-label="Dificuldade"
                >
                  <option value="facil">Fácil</option>
                  <option value="medio">Médio</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof CheckCircle2;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
      <Icon className="h-4 w-4 text-primary" />
      <div>
        <p className="text-sm font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
