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
  Wand2,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { ExtractedQuestion } from "@/lib/pdf-import.functions";
import { extractQuestionsFromPage, saveImportedQuestions } from "@/lib/pdf-import.functions";
import { fetchCategories } from "@/lib/quiz";

type Draft = ExtractedQuestion & { key: string; page: number; category_id: string | null };

const LETTERS = ["A", "B", "C", "D"] as const;
const PAGE_REQUEST_INTERVAL_MS = 12_000;

/** Carrega o pdfjs apenas no browser e configura o worker. */
async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

type ImageBox = { x: number; y: number; width: number; height: number };

/** Multiplica duas matrizes 2D (formato pdf.js: [a, b, c, d, e, f]). */
function multiplyMatrix(m1: number[], m2: number[]): number[] {
  const [a1 = 0, b1 = 0, c1 = 0, d1 = 0, e1 = 0, f1 = 0] = m1;
  const [a2 = 0, b2 = 0, c2 = 0, d2 = 0, e2 = 0, f2 = 0] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

/**
 * Extrai as caixas (em coordenadas do canvas) de todas as imagens embebidas
 * na página, percorrendo a operator list do pdf.js.
 */
async function extractPageImageBoxes(
  page: { getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }> },
  viewport: {
    width: number;
    height: number;
    convertToViewportPoint: (x: number, y: number) => number[];
  },
  scale: number,
): Promise<ImageBox[]> {
  try {
    const pdfjs = await loadPdfjs();
    const { OPS } = pdfjs;
    const { fnArray, argsArray } = await page.getOperatorList();
    const boxes: ImageBox[] = [];
    let ctm = [1, 0, 0, 1, 0, 0];
    const stack: number[][] = [];
    for (let i = 0; i < fnArray.length; i += 1) {
      const fn = fnArray[i];
      const args = argsArray[i];
      const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = ctm;
      if (fn === OPS.save) {
        stack.push([...ctm]);
      } else if (fn === OPS.restore) {
        ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
      } else if (fn === OPS.transform && Array.isArray(args)) {
        ctm = multiplyMatrix(args as number[], ctm);
      } else if (
        (fn === OPS.paintImageXObject ||
          fn === OPS.paintImageXObjectRepeat ||
          fn === OPS.paintInlineImageXObject) &&
        Array.isArray(args)
      ) {
        // paintImageXObject desenha a imagem no quadrado unitário (0..1)
        // transformado pela CTM — a matriz já contém a escala de colocação.
        // Usar a largura/altura em pixéis da imagem aqui distorcia as caixas.
        const corners = [
          viewport.convertToViewportPoint(e, f),
          viewport.convertToViewportPoint(e + a, f + b),
          viewport.convertToViewportPoint(e + c, f + d),
          viewport.convertToViewportPoint(e + a + c, f + b + d),
        ];
        const xs = corners.map((p) => p[0] ?? 0);
        const ys = corners.map((p) => p[1] ?? 0);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        const width = Math.max(...xs) - x;
        const height = Math.max(...ys) - y;
        // Ignora imagens minúsculas (padrões/logos de 1-2px repetidos).
        if (width > 16 * scale && height > 16 * scale) {
          boxes.push({ x, y, width, height });
        }
      }
    }
    return mergeImageBoxes(boxes.sort((a, b) => a.y - b.y || a.x - b.x));
  } catch {
    return [];
  }
}

/** Área de interseção entre duas caixas. */
function intersectionArea(a: ImageBox, b: ImageBox): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Escolhe a melhor imagem embebida para a região indicada pela IA.
 * Se a IA não indicar região e houver tantas imagens como questões, usa a
 * ordem vertical (as questões e as imagens vêm ambas de cima para baixo).
 */
function pickImageBox(
  boxes: ImageBox[],
  region: { x: number; y: number; width: number; height: number } | null,
  canvasWidth: number,
  canvasHeight: number,
  questionIndex: number,
  questionCount: number,
): ImageBox | null {
  if (boxes.length === 0) return null;
  if (region && region.width > 0 && region.height > 0) {
    const target: ImageBox = {
      x: region.x * canvasWidth,
      y: region.y * canvasHeight,
      width: region.width * canvasWidth,
      height: region.height * canvasHeight,
    };
    let best: ImageBox | null = null;
    let bestArea = 0;
    for (const box of boxes) {
      const area = intersectionArea(box, target);
      if (area > bestArea) {
        bestArea = area;
        best = box;
      }
    }
    if (best) return best;
    // Sem interseção: imagem mais próxima verticalmente do centro da região.
    const cy = target.y + target.height / 2;
    return boxes.reduce((a, b) =>
      Math.abs(a.y + a.height / 2 - cy) < Math.abs(b.y + b.height / 2 - cy) ? a : b,
    );
  }
  // Fallback: uma imagem por questão, na ordem de leitura.
  if (boxes.length === questionCount) return boxes[questionIndex] ?? null;
  return null;
}

/** Recorta uma caixa (com margem) do canvas renderizado para um JPEG Blob. */
async function cropBoxToBlob(canvas: HTMLCanvasElement, box: ImageBox): Promise<Blob | null> {
  const pad = Math.round(Math.min(box.width, box.height) * 0.03);
  const x = Math.max(0, Math.floor(box.x - pad));
  const y = Math.max(0, Math.floor(box.y - pad));
  const width = Math.min(canvas.width - x, Math.ceil(box.width + pad * 2));
  const height = Math.min(canvas.height - y, Math.ceil(box.height + pad * 2));
  if (width <= 0 || height <= 0) return null;
  const crop = document.createElement("canvas");
  crop.width = width;
  crop.height = height;
  crop.getContext("2d")?.drawImage(canvas, x, y, width, height, 0, 0, width, height);
  return new Promise<Blob | null>((resolve) => crop.toBlob(resolve, "image/jpeg", 0.86));
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
  const docRef = useRef<Awaited<
    ReturnType<Awaited<ReturnType<typeof loadPdfjs>>["getDocument"]>["promise"]
  > | null>(null);

  const catList = (categories ?? []).map((c) => ({ slug: c.slug, name: c.name }));

  const updateImportRow = useCallback(
    async (
      id: string,
      patch: Partial<{
        processed_pages: number;
        questions_found: number;
        failed_pages: number[];
        status: string;
      }>,
    ) => {
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
      // Aumenta a resolução para preservar letras pequenas e o marcador verde da resposta.
      const viewport = page.getViewport({ scale: 4 });
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

      // Posições reais das imagens embebidas na página (mucho mais fiáveis do
      // que as coordenadas estimadas pela IA).
      const imageBoxes = await extractPageImageBoxes(page, viewport, 4);

      const result = await extractQuestionsFromPage({
        data: { imageBase64, pageText, page: pageNumber, categories: catList },
      });

      const found = await Promise.all(
        result.questions.map(async (q, i) => {
          let imageUrl = q.image_url;
          const box = pickImageBox(
            imageBoxes,
            q.image_region,
            canvas.width,
            canvas.height,
            i,
            result.questions.length,
          );
          if (box) {
            const blob = await cropBoxToBlob(canvas, box);
            if (blob) {
              const path = `${imageFolder}/${pageNumber}-${i}.jpg`;
              const upload = await supabase.storage.from("question-images").upload(path, blob, {
                contentType: "image/jpeg",
                upsert: true,
              });
              if (!upload.error) {
                imageUrl = supabase.storage.from("question-images").getPublicUrl(path)
                  .data.publicUrl;
              }
            }
          }
          return {
            ...q,
            image_url: imageUrl,
            key: `${pageNumber}-${i}-${Math.random().toString(36).slice(2, 7)}`,
            page: pageNumber,
            category_id: (categories ?? []).find((c) => c.slug === q.category_slug)?.id ?? null,
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
        if (pageNumber !== pages[pages.length - 1]) {
          setMessage("A preparar a próxima página para evitar o limite da IA...");
          await new Promise((resolve) => window.setTimeout(resolve, PAGE_REQUEST_INTERVAL_MS));
        }
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <textarea
                    value={d.question_text}
                    onChange={(e) => patch(d.key, { question_text: e.target.value })}
                    rows={3}
                    placeholder="Texto da questão"
                    className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
                  />

                  {d.image_url ? (
                    <div className="space-y-2">
                      <div className="group relative aspect-video overflow-hidden rounded-xl bg-muted border border-border">
                        <img
                          src={d.image_url}
                          alt="Imagem da questão"
                          className="h-full w-full object-contain"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => patch(d.key, { image_url: null })}
                            className="rounded-lg bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground"
                          >
                            Remover imagem
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                        Imagem extraída do PDF
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                        Imagem (URL)
                      </p>
                      <input
                        value={d.image_url ?? ""}
                        onChange={(e) => patch(d.key, { image_url: e.target.value || null })}
                        placeholder="Sem imagem. Cola um link se necessário..."
                        className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const raw = d.question_text.trim();
                      const prompt = `Fotografia realista, estilo foto de exame oficial de carta de condução de Moçambique, sem texto overlays, sem cartoons, sem efeitos de IA. Cenário: condução em estrada de Moçambique, veículo ligeiro, condições de trânsito reais. Iluminação natural, detalhes de sinalização e de tráfego. Questão: ${raw}`;
                      const encoded = encodeURIComponent(prompt);
                      window.open(`https://labs.google/fx/tool/image?utm_source=clipboard&utm_medium=organic&utm_campaign=card-imagefx-desktop&text=${encoded}`, "_blank");
                      navigator.clipboard.writeText(prompt).then(() => {
                        toast.success("Prompt copiado para a área de transferência.");
                      }).catch(() => {
                        toast.message("Prompt gerado. Usa o texto para gerar a imagem no ImageFX.");
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold transition-colors hover:bg-secondary"
                  >
                    <Wand2 className="h-4 w-4" />
                    Gerar imagem com IA
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid gap-2">
                    {LETTERS.map((letter) => {
                      const field = `option_${letter.toLowerCase()}` as
                        "option_a" | "option_b" | "option_c" | "option_d";
                      return (
                        <label key={letter} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={`correct-${d.key}`}
                            checked={d.correct_answer === letter}
                            onChange={() => patch(d.key, { correct_answer: letter })}
                            aria-label={`Marcar ${letter} como correcta`}
                          />
                          <span className="w-4 font-semibold text-muted-foreground">{letter}</span>
                          <input
                            value={d[field]}
                            onChange={(e) =>
                              patch(d.key, { [field]: e.target.value } as Partial<Draft>)
                            }
                            className="flex-1 rounded-lg border border-input bg-card px-2 py-1.5 text-sm"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <textarea
                value={d.explanation}
                onChange={(e) => patch(d.key, { explanation: e.target.value })}
                rows={2}
                placeholder="Explicação / Justificação"
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
