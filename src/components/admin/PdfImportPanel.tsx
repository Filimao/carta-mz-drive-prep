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
  Clock3,
  Zap,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { ExtractedQuestion } from "@/lib/pdf-import.functions";
import {
  extractQuestionsFromPage,
  saveImportedQuestions,
} from "@/lib/pdf-import.functions";
import { fetchCategories } from "@/lib/quiz";

type Draft = ExtractedQuestion & {
  key: string;
  page: number;
  category_id: string | null;
};

const LETTERS = ["A", "B", "C", "D"] as const;

/**
 * Número máximo de páginas processadas simultaneamente.
 *
 * 3 é um bom equilíbrio entre velocidade e estabilidade.
 */
const CONCURRENCY = 3;

/**
 * Número máximo de tentativas por página.
 */
const MAX_RETRIES = 3;

/**
 * Carrega o PDF.js somente no browser.
 */
async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (
    await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  ).default;

  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  return pdfjs;
}

/**
 * Espera alguns milissegundos.
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry com exponential backoff.
 *
 * 1ª tentativa
 * ↓
 * 1s
 * ↓
 * 2ª tentativa
 * ↓
 * 2s
 * ↓
 * 3ª tentativa
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  onRetry?: (attempt: number, error: unknown) => void,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= retries) {
        break;
      }

      onRetry?.(attempt, error);

      const delay = 1000 * Math.pow(2, attempt - 1);

      await sleep(delay);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha desconhecida ao processar a página.");
}

/**
 * Extrai uma mensagem útil do erro.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Erro desconhecido.";
  }
}

/**
 * Formata segundos.
 */
function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0s";
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  return `${minutes}m ${remainingSeconds}s`;
}

export function PdfImportPanel() {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const [file, setFile] = useState<File | null>(null);

  const [importId, setImportId] = useState<string | null>(null);

  const [storagePath, setStoragePath] = useState<string | null>(null);

  const [totalPages, setTotalPages] = useState(0);

  /**
   * Páginas concluídas com sucesso.
   */
  const [completedPages, setCompletedPages] = useState<number[]>([]);

  /**
   * Páginas que falharam depois de todas as tentativas.
   */
  const [failedPages, setFailedPages] = useState<number[]>([]);

  /**
   * Página atualmente sendo processada.
   */
  const [processingPages, setProcessingPages] = useState<number[]>([]);

  const [drafts, setDrafts] = useState<Draft[]>([]);

  const [status, setStatus] = useState<
    "idle" | "uploading" | "running" | "paused" | "done" | "error"
  >("idle");

  const [message, setMessage] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  /**
   * Tempo total da importação.
   */
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  /**
   * Número total de questões encontradas.
   */
  const [questionsFound, setQuestionsFound] = useState(0);

  /**
   * Referência para pausa.
   */
  const pausedRef = useRef(false);

  /**
   * Evita duas execuções simultâneas.
   */
  const runningRef = useRef(false);

  /**
   * Páginas concluídas persistentes em memória.
   */
  const completedRef = useRef<Set<number>>(new Set());

  /**
   * Páginas com erro.
   */
  const failedRef = useRef<Set<number>>(new Set());

  /**
   * PDF carregado.
   */
  const docRef = useRef<
    Awaited<
      ReturnType<
        Awaited<ReturnType<typeof loadPdfjs>>["getDocument"]
      >["promise"]
    > | null
  >(null);

  /**
   * Tempo de início.
   */
  const startedAtRef = useRef<number | null>(null);

  const catList = (categories ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
  }));

  /**
   * Atualiza a linha da importação no Supabase.
   */
  const updateImportRow = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      const { error } = await supabase
        .from("question_imports")
        .update(patch as never)
        .eq("id", id);

      if (error) {
        console.warn("Não foi possível atualizar importação:", error);
      }
    },
    [],
  );

  /**
   * Atualiza o progresso local.
   */
  const updateProgress = useCallback(() => {
    const completed = Array.from(completedRef.current).sort((a, b) => a - b);

    const failed = Array.from(failedRef.current).sort((a, b) => a - b);

    setCompletedPages(completed);
    setFailedPages(failed);

    return {
      completed,
      failed,
      processed: completed.length + failed.length,
    };
  }, []);

  /**
   * Processa uma página.
   */
  const processPage = useCallback(
    async (pageNumber: number, imageFolder: string) => {
      const doc = docRef.current;

      if (!doc) {
        throw new Error("PDF não carregado.");
      }

      const page = await doc.getPage(pageNumber);

      /**
       * Escala 2 oferece boa qualidade para OCR.
       */
      const viewport = page.getViewport({
        scale: 2,
      });

      const canvas = document.createElement("canvas");

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Não foi possível preparar o canvas.");
      }

      await page.render({
        canvas,
        canvasContext: ctx,
        viewport,
      } as never).promise;

      /**
       * JPEG de boa qualidade.
       *
       * 0.82 reduz o tamanho sem destruir muito texto.
       */
      const imageBase64 = canvas.toDataURL(
        "image/jpeg",
        0.82,
      );

      /**
       * Extrai também o texto nativo do PDF.
       *
       * Isto ajuda muito quando o PDF possui texto pesquisável.
       */
      const text = await page.getTextContent();

      const pageText = text.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .trim();

      /**
       * Chamada à IA com retry.
       */
      const result = await withRetry(
        () =>
          extractQuestionsFromPage({
            data: {
              imageBase64,
              pageText,
              page: pageNumber,
              categories: catList,
            },
          }),
        MAX_RETRIES,
        (attempt, error) => {
          setMessage(
            `Página ${pageNumber}: tentativa ${attempt + 1}/${MAX_RETRIES}. ${getErrorMessage(error)}`,
          );
        },
      );

      /**
       * Faz upload das imagens das questões.
       */
      const found = await Promise.all(
        result.questions.map(async (q, index) => {
          let imageUrl = q.image_url;

          const region = q.image_region;

          if (
            region &&
            region.width > 0 &&
            region.height > 0
          ) {
            const crop = document.createElement("canvas");

            const x = Math.max(
              0,
              Math.floor(region.x * canvas.width),
            );

            const y = Math.max(
              0,
              Math.floor(region.y * canvas.height),
            );

            const width = Math.min(
              canvas.width - x,
              Math.floor(region.width * canvas.width),
            );

            const height = Math.min(
              canvas.height - y,
              Math.floor(region.height * canvas.height),
            );

            if (width > 0 && height > 0) {
              crop.width = width;
              crop.height = height;

              crop
                .getContext("2d")
                ?.drawImage(
                  canvas,
                  x,
                  y,
                  width,
                  height,
                  0,
                  0,
                  width,
                  height,
                );

              const blob = await new Promise<Blob | null>(
                (resolve) =>
                  crop.toBlob(
                    resolve,
                    "image/jpeg",
                    0.86,
                  ),
              );

              if (blob) {
                const path = `${imageFolder}/${pageNumber}-${index}.jpg`;

                const upload = await supabase.storage
                  .from("question-images")
                  .upload(path, blob, {
                    contentType: "image/jpeg",
                    upsert: true,
                  });

                if (!upload.error) {
                  imageUrl = supabase.storage
                    .from("question-images")
                    .getPublicUrl(path)
                    .data.publicUrl;
                }
              }
            }
          }

          return {
            ...q,
            image_url: imageUrl,

            key: `${pageNumber}-${index}-${Math.random()
              .toString(36)
              .slice(2, 9)}`,

            page: pageNumber,

            category_id:
              (categories ?? []).find(
                (category) =>
                  category.slug === q.category_slug,
              )?.id ?? null,
          };
        }),
      );

      setDrafts((previous) => [
        ...previous,
        ...found,
      ]);

      setQuestionsFound((previous) =>
        previous + found.length,
      );

      return found.length;
    },
    [catList, categories],
  );

  /**
   * Worker responsável por processar páginas.
   */
  const runWorker = useCallback(
    async (
      queue: number[],
      id: string,
      imageFolder: string,
    ) => {
      while (!pausedRef.current) {
        const pageNumber = queue.shift();

        if (!pageNumber) {
          return;
        }

        /**
         * Não processar novamente uma página já concluída.
         */
        if (completedRef.current.has(pageNumber)) {
          continue;
        }

        setProcessingPages((previous) =>
          previous.includes(pageNumber)
            ? previous
            : [...previous, pageNumber],
        );

        const startedPage = performance.now();

        try {
          await processPage(
            pageNumber,
            imageFolder,
          );

          completedRef.current.add(pageNumber);

          /**
           * Se anteriormente tinha falhado,
           * remove o erro.
           */
          failedRef.current.delete(pageNumber);

          const elapsed =
            (performance.now() - startedPage) / 1000;

          setMessage(
            `Página ${pageNumber} concluída em ${formatDuration(elapsed)}.`,
          );
        } catch (error) {
          failedRef.current.add(pageNumber);

          const errorMessage =
            getErrorMessage(error);

          setMessage(
            `Página ${pageNumber}: ${errorMessage}`,
          );
        } finally {
          setProcessingPages((previous) =>
            previous.filter(
              (page) => page !== pageNumber,
            ),
          );

          const progress = updateProgress();

          await updateImportRow(id, {
            processed_pages:
              progress.processed,

            questions_found:
              questionsFound,

            failed_pages:
              progress.failed,

            status: "em_progresso",
          });
        }
      }
    },
    [
      processPage,
      questionsFound,
      updateImportRow,
      updateProgress,
    ],
  );

  /**
   * Executa várias páginas simultaneamente.
   */
  const runPages = useCallback(
    async (
      pages: number[],
      id: string,
      imageFolder: string,
    ) => {
      if (runningRef.current) {
        return;
      }

      runningRef.current = true;

      pausedRef.current = false;

      setStatus("running");

      const queue = [...pages].filter(
        (page) =>
          !completedRef.current.has(page),
      );

      if (queue.length === 0) {
        runningRef.current = false;

        setStatus("done");

        return;
      }

      /**
       * Máximo de 3 workers simultâneos.
       */
      const workerCount = Math.min(
        CONCURRENCY,
        queue.length,
      );

      await Promise.all(
        Array.from(
          { length: workerCount },
          () =>
            runWorker(
              queue,
              id,
              imageFolder,
            ),
        ),
      );

      runningRef.current = false;

      if (pausedRef.current) {
        setStatus("paused");

        setMessage(
          "Importação pausada. As páginas em processamento terminarão e as restantes poderão ser retomadas.",
        );

        return;
      }

      const progress = updateProgress();

      if (
        progress.processed >= totalPages &&
        progress.failed.length === 0
      ) {
        setStatus("done");

        setMessage(
          `Importação concluída. ${progress.completed.length} páginas processadas com sucesso.`,
        );

        await updateImportRow(id, {
          status: "concluido",
          processed_pages:
            progress.processed,
          questions_found:
            questionsFound,
          failed_pages: [],
        });

        return;
      }

      if (
        progress.processed >= totalPages &&
        progress.failed.length > 0
      ) {
        setStatus("done");

        setMessage(
          `Importação concluída com ${progress.failed.length} página(s) com erro.`,
        );

        await updateImportRow(id, {
          status: "com_erros",
          processed_pages:
            progress.processed,
          questions_found:
            questionsFound,
          failed_pages:
            progress.failed,
        });

        return;
      }

      setStatus("paused");
    },
    [
      runWorker,
      questionsFound,
      totalPages,
      updateImportRow,
      updateProgress,
    ],
  );

  /**
   * Inicia nova importação.
   */
  async function startImport() {
    if (!file) {
      return;
    }

    try {
      setStatus("uploading");

      setMessage(
        "A enviar o PDF...",
      );

      completedRef.current.clear();
      failedRef.current.clear();

      setCompletedPages([]);
      setFailedPages([]);
      setProcessingPages([]);
      setDrafts([]);
      setQuestionsFound(0);
      setElapsedSeconds(0);

      const { data: auth } =
        await supabase.auth.getUser();

      const userId = auth.user?.id;

      if (!userId) {
        throw new Error(
          "Sessão expirada. Faça login novamente.",
        );
      }

      const safeName =
        file.name.replace(
          /[^\w.-]+/g,
          "_",
        );

      const path =
        `${userId}/${Date.now()}-${safeName}`;

      /**
       * Upload do PDF.
       */
      const upload =
        await supabase.storage
          .from("question-pdfs")
          .upload(
            path,
            file,
            {
              contentType:
                "application/pdf",
              upsert: false,
            },
          );

      if (upload.error) {
        throw new Error(
          upload.error.message,
        );
      }

      setStoragePath(path);

      setMessage(
        "A analisar o número de páginas...",
      );

      /**
       * Carrega PDF.js.
       */
      const buffer =
        await file.arrayBuffer();

      const pdfjs =
        await loadPdfjs();

      const doc =
        await pdfjs
          .getDocument({
            data: new Uint8Array(buffer),
          })
          .promise;

      docRef.current = doc;

      setTotalPages(doc.numPages);

      /**
       * Cria registro da importação.
       */
      const row =
        await supabase
          .from("question_imports")
          .insert({
            created_by: userId,
            file_name: file.name,
            storage_path: path,
            total_pages:
              doc.numPages,
            status:
              "em_progresso",
            processed_pages: 0,
            questions_found: 0,
            failed_pages: [],
          })
          .select("id")
          .single();

      if (row.error) {
        throw new Error(
          row.error.message,
        );
      }

      const newImportId =
        row.data.id;

      setImportId(newImportId);

      startedAtRef.current =
        Date.now();

      const pages = Array.from(
        {
          length: doc.numPages,
        },
        (_, index) =>
          index + 1,
      );

      await runPages(
        pages,
        newImportId,
        `${userId}/${newImportId}`,
      );
    } catch (error) {
      setStatus("error");

      setMessage(
        getErrorMessage(error),
      );

      toast.error(
        getErrorMessage(error),
      );
    }
  }

  /**
   * Pausa.
   */
  function pause() {
    pausedRef.current = true;

    setMessage(
      "A pausar... as páginas que já estão em processamento terminarão.",
    );
  }

  /**
   * Retoma apenas páginas que ainda não terminaram.
   */
  async function resume() {
    if (!importId) {
      return;
    }

    const { data } =
      await supabase.auth.getUser();

    if (!data.user) {
      return;
    }

    const remaining =
      Array.from(
        {
          length: totalPages,
        },
        (_, index) =>
          index + 1,
      ).filter(
        (page) =>
          !completedRef.current.has(
            page,
          ),
      );

    if (remaining.length === 0) {
      setStatus("done");

      setMessage(
        "Todas as páginas já foram processadas.",
      );

      return;
    }

    await runPages(
      remaining,
      importId,
      `${data.user.id}/${importId}`,
    );
  }

  /**
   * Reprocessa somente as páginas que falharam.
   */
  async function retryFailed() {
    if (
      !importId ||
      failedRef.current.size === 0
    ) {
      return;
    }

    const { data } =
      await supabase.auth.getUser();

    if (!data.user) {
      return;
    }

    const pages =
      Array.from(
        failedRef.current,
      );

    /**
     * Remove temporariamente da lista de falhas.
     */
    pages.forEach((page) => {
      failedRef.current.delete(page);
    });

    updateProgress();

    setMessage(
      `A reprocessar ${pages.length} página(s)...`,
    );

    await runPages(
      pages,
      importId,
      `${data.user.id}/${importId}`,
    );
  }

  /**
   * Publica as questões.
   */
  async function publish() {
    if (
      !importId ||
      drafts.length === 0
    ) {
      return;
    }

    setSaving(true);

    try {
      const res =
        await saveImportedQuestions({
          data: {
            importId,

            sourceDocument:
              file?.name ??
              storagePath ??
              "PDF",

            questions:
              drafts.map(
                ({
                  key: _key,
                  ...question
                }) => question,
              ),
          },
        });

      toast.success(
        `${res.inserted} questões guardadas${
          res.needsReview > 0
            ? ` (${res.needsReview} para revisão)`
            : ""
        }.`,
      );

      setDrafts([]);
    } catch (error) {
      toast.error(
        getErrorMessage(error),
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * Edita uma questão.
   */
  function patch(
    key: string,
    changes: Partial<Draft>,
  ) {
    setDrafts((previous) =>
      previous.map((draft) =>
        draft.key === key
          ? {
              ...draft,
              ...changes,
            }
          : draft,
      ),
    );
  }

  const processed =
    completedPages.length +
    failedPages.length;

  const percent =
    totalPages > 0
      ? Math.round(
          (processed /
            totalPages) *
            100,
        )
      : 0;

  const highConfidence =
    drafts.filter(
      (draft) =>
        draft.confidence >= 0.9,
    ).length;

  const reviewCount =
    drafts.filter(
      (draft) =>
        draft.confidence >= 0.7 &&
        draft.confidence < 0.9,
    ).length;

  const lowConfidence =
    drafts.filter(
      (draft) =>
        draft.confidence < 0.7,
    ).length;

  const runningTime =
    startedAtRef.current
      ? Math.round(
          (Date.now() -
            startedAtRef.current) /
            1000,
        )
      : elapsedSeconds;

  return (
    <section className="mt-6 space-y-6">
      {/* IMPORTAR */}
      <div className="surface rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Importar questões por PDF
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Envia um PDF com questões da carta de
              condução. A IA analisa texto e imagem,
              extrai as questões e marca conteúdos com
              baixa confiança para revisão.
            </p>
          </div>

          <div className="hidden rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs sm:flex sm:items-center sm:gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Até {CONCURRENCY} páginas simultâneas
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm">
            <FileUp className="h-5 w-5 text-primary" />

            <span className="truncate">
              {file?.name ??
                "Escolher ficheiro PDF"}
            </span>

            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => {
                setFile(
                  event.target.files?.[0] ??
                    null,
                );
              }}
            />
          </label>

          <button
            type="button"
            disabled={
              !file ||
              status === "uploading" ||
              status === "running"
            }
            onClick={() =>
              void startImport()
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {status === "uploading" ||
            status === "running" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}

            {status === "running"
              ? "A processar..."
              : "Iniciar importação"}
          </button>
        </div>
      </div>

      {/* PROGRESSO */}
      {totalPages > 0 && (
        <div className="surface rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                Progresso: {processed}/
                {totalPages} páginas (
                {percent}%)
              </p>

              {processingPages.length >
                0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  A processar:{" "}
                  {processingPages
                    .sort(
                      (a, b) =>
                        a - b,
                    )
                    .join(", ")}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {status === "running" ? (
                <button
                  type="button"
                  onClick={pause}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
                >
                  <Pause className="h-4 w-4" />
                  Pausar
                </button>
              ) : (
                processed <
                  totalPages && (
                  <button
                    type="button"
                    onClick={() =>
                      void resume()
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
                  >
                    <Play className="h-4 w-4" />
                    Retomar
                  </button>
                )
              )}

              {failedPages.length >
                0 &&
                status !==
                  "running" && (
                  <button
                    type="button"
                    onClick={() =>
                      void retryFailed()
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
                  >
                    <RefreshCw className="h-4 w-4" />

                    Reprocessar{" "}
                    {
                      failedPages.length
                    }
                  </button>
                )}
            </div>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{
                width: `${percent}%`,
              }}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Páginas concluídas"
              value={`${completedPages.length}`}
              icon={CheckCircle2}
            />

            <Stat
              label="Questões encontradas"
              value={`${questionsFound}`}
              icon={FileUp}
            />

            <Stat
              label="Páginas com erro"
              value={`${failedPages.length}`}
              icon={AlertTriangle}
            />

            <Stat
              label="Tempo"
              value={formatDuration(
                runningTime,
              )}
              icon={Clock3}
            />
          </div>

          {processingPages.length >
            0 && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />

                <span>
                  A IA está a analisar{" "}
                  {
                    processingPages.length
                  }{" "}
                  página(s) em paralelo...
                </span>
              </div>
            </div>
          )}

          {message && (
            <p className="mt-3 text-xs text-muted-foreground">
              {message}
            </p>
          )}
        </div>
      )}

      {/* RESUMO DA IA */}
      {drafts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <ConfidenceStat
            label="Alta confiança"
            value={highConfidence}
            description="≥ 90%"
            type="good"
          />

          <ConfidenceStat
            label="Revisão necessária"
            value={reviewCount}
            description="70–89%"
            type="warning"
          />

          <ConfidenceStat
            label="Baixa confiança"
            value={lowConfidence}
            description="< 70%"
            type="danger"
          />
        </div>
      )}

      {/* PRÉ-VISUALIZAÇÃO */}
      {drafts.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-base font-semibold">
              Pré-visualização (
              {drafts.length})
            </h3>

            <button
              type="button"
              disabled={saving}
              onClick={() =>
                void publish()
              }
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              Guardar e publicar
            </button>
          </div>

          {drafts.map((draft) => {
            const confidence =
              Math.round(
                draft.confidence * 100,
              );

            const confidenceClass =
              confidence >= 90
                ? "border-emerald-500/30 bg-emerald-500/5"
                : confidence >= 70
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-destructive/30 bg-destructive/5";

            return (
              <article
                key={draft.key}
                className={`surface space-y-3 rounded-2xl border p-4 ${confidenceClass}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">
                      Página{" "}
                      {draft.page}
                    </span>

                    <span>·</span>

                    <span
                      className={
                        confidence >=
                        90
                          ? "font-semibold text-emerald-600"
                          : confidence >=
                              70
                            ? "font-semibold text-amber-600"
                            : "font-semibold text-destructive"
                      }
                    >
                      Confiança{" "}
                      {confidence}%
                    </span>

                    {confidence <
                      90 && (
                      <>
                        <span>·</span>

                        <span className="font-semibold text-amber-600">
                          Revisão necessária
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setDrafts(
                        (previous) =>
                          previous.filter(
                            (item) =>
                              item.key !==
                              draft.key,
                          ),
                      )
                    }
                    className="inline-flex items-center gap-1 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </button>
                </div>

                <textarea
                  value={
                    draft.question_text
                  }
                  onChange={(event) =>
                    patch(
                      draft.key,
                      {
                        question_text:
                          event.target
                            .value,
                      },
                    )
                  }
                  rows={3}
                  className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  {LETTERS.map(
                    (letter) => {
                      const field =
                        `option_${letter.toLowerCase()}` as
                          | "option_a"
                          | "option_b"
                          | "option_c"
                          | "option_d";

                      return (
                        <label
                          key={
                            letter
                          }
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="radio"
                            name={`correct-${draft.key}`}
                            checked={
                              draft.correct_answer ===
                              letter
                            }
                            onChange={() =>
                              patch(
                                draft.key,
                                {
                                  correct_answer:
                                    letter,
                                },
                              )
                            }
                            aria-label={`Marcar ${letter} como correta`}
                          />

                          <span className="w-4 font-semibold">
                            {letter}
                          </span>

                          <input
                            value={
                              draft[
                                field
                              ]
                            }
                            onChange={(
                              event,
                            ) =>
                              patch(
                                draft.key,
                                {
                                  [field]:
                                    event
                                      .target
                                      .value,
                                } as Partial<Draft>,
                              )
                            }
                            className="flex-1 rounded-lg border border-input bg-card px-2 py-1.5 text-sm"
                          />
                        </label>
                      );
                    },
                  )}
                </div>

                <textarea
                  value={
                    draft.explanation
                  }
                  onChange={(event) =>
                    patch(
                      draft.key,
                      {
                        explanation:
                          event.target
                            .value,
                      },
                    )
                  }
                  rows={3}
                  placeholder="Explicação"
                  className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={
                      draft.category_id ??
                      ""
                    }
                    onChange={(event) =>
                      patch(
                        draft.key,
                        {
                          category_id:
                            event.target
                              .value ||
                            null,
                        },
                      )
                    }
                    className="rounded-xl border border-input bg-card px-3 py-2 text-sm"
                    aria-label="Categoria"
                  >
                    <option value="">
                      Sem categoria
                    </option>

                    {(
                      categories ?? []
                    ).map(
                      (category) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      ),
                    )}
                  </select>

                  <select
                    value={
                      draft.difficulty
                    }
                    onChange={(event) =>
                      patch(
                        draft.key,
                        {
                          difficulty:
                            event.target
                              .value as Draft["difficulty"],
                        },
                      )
                    }
                    className="rounded-xl border border-input bg-card px-3 py-2 text-sm"
                    aria-label="Dificuldade"
                  >
                    <option value="facil">
                      Fácil
                    </option>

                    <option value="medio">
                      Médio
                    </option>

                    <option value="dificil">
                      Difícil
                    </option>
                  </select>
                </div>
              </article>
            );
          })}
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
        <p className="text-sm font-semibold">
          {value}
        </p>

        <p className="text-xs text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

function ConfidenceStat({
  label,
  value,
  description,
  type,
}: {
  label: string;
  value: number;
  description: string;
  type: "good" | "warning" | "danger";
}) {
  const icon =
    type === "good"
      ? CheckCircle2
      : type === "warning"
        ? AlertTriangle
        : AlertTriangle;

  const Icon = icon;

  return (
    <div className="surface flex items-center gap-3 rounded-2xl p-4">
      <Icon className="h-5 w-5 text-primary" />

      <div>
        <p className="text-xs text-muted-foreground">
          {label}
        </p>

        <p className="text-xl font-bold">
          {value}
        </p>

        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
