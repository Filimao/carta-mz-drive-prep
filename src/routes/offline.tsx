import { createFileRoute, Link } from "@tanstack/react-router";
import { CloudDownload, Loader2, WifiOff, Play, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { InstallButton } from "@/components/PwaInstall";
import { usePlano } from "@/hooks/usePlano";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { QuizEngine } from "@/components/QuizEngine";
import {
  loadPack,
  offlinePackExpiry,
  savePack,
  validPack,
  queuedSessions,
  OFFLINE_IMAGE_CACHE,
} from "@/lib/offline-store";
import { fetchCategories, flushPendingSessions, type Category, type Question } from "@/lib/quiz";
import { trackProductEvent } from "@/lib/product-analytics";
import { requireRouteAuth } from "@/lib/route-auth";

export const Route = createFileRoute("/offline")({
  ssr: false,
  beforeLoad: requireRouteAuth,
  head: () => ({
    meta: [
      { title: "Modo offline — Carta MZ Quiz" },
      {
        name: "description",
        content:
          "Guarde as questões no telemóvel e continue a estudar sem internet — função do plano Premium.",
      },
      { property: "og:title", content: "Modo offline — Carta MZ Quiz" },
      { property: "og:description", content: "Estude em qualquer lugar, mesmo sem dados móveis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Offline,
});

function Offline() {
  const plano = usePlano();
  const session = useSession();
  const allowed =
    plano.status.launchAccess ||
    (plano.status.plan.offline && !plano.status.expired) ||
    session.isAdmin;
  const [count, setCount] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [packExpiresAt, setPackExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [images, setImages] = useState(0);
  const [failedImages, setFailedImages] = useState(0);
  const [downloadedQuestions, setDownloadedQuestions] = useState(0);
  const [questionTotal, setQuestionTotal] = useState(0);
  const [imageTotal, setImageTotal] = useState(0);
  const [pendingSessions, setPendingSessions] = useState(0);
  const [progress, setProgress] = useState(0);
  const [started, setStarted] = useState(false);
  const [packIsValid, setPackIsValid] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "synced" | "pending">("idle");

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const updatePending = async () => {
      const { data } = await supabase.auth.getSession();
      setPendingSessions(
        data.session
          ? (await queuedSessions()).filter((item) => item.user_id === data.session!.user.id).length
          : 0,
      );
    };
    const loadLocalData = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const [pack, queued] = await Promise.all([loadPack(data.session.user.id), queuedSessions()]);
      setPackIsValid(validPack(pack));
      if (pack) {
        setCount(pack.questions.length);
        setDownloadedQuestions(pack.questions.length);
        setQuestionTotal(pack.questions.length);
        setSavedAt(pack.savedAt);
        setPackExpiresAt(pack.expiresAt);
        setImages(pack.images);
        setFailedImages(pack.failedImages ?? 0);
        setImageTotal(pack.images + (pack.failedImages ?? 0));
        setProgress(validPack(pack) ? 100 : 0);
      }
      setPendingSessions(queued.filter((item) => item.user_id === data.session!.user.id).length);
    };
    void loadLocalData().catch((error: unknown) => {
      console.error("[offline] Não foi possível ler os dados locais:", error);
      toast.error("Não foi possível ler o pacote guardado neste dispositivo.");
    });
    const syncWhenOnline = () => {
      setOnline(true);
      setSyncState("syncing");
      void flushPendingSessions()
        .then(updatePending)
        .then(() => setSyncState("synced"))
        .catch((error: unknown) => {
          console.error("[offline] A sincronização das sessões falhou:", error);
          setSyncState("pending");
        });
    };
    window.addEventListener("online", syncWhenOnline);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("online", syncWhenOnline);
    };
  }, []);

  async function sync() {
    setLoading(true);
    setProgress(0);
    setDownloadedQuestions(0);
    setQuestionTotal(0);
    setImageTotal(0);
    setImages(0);
    setFailedImages(0);
    setSyncState("syncing");
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session || !allowed)
        throw new Error("Inicie sessão para descarregar o pacote de estudo.");
      const { count: publishedCount, error: countError } = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true);
      if (countError) throw countError;
      const totalQuestions = publishedCount ?? 0;
      setQuestionTotal(totalQuestions);
      const questions: Question[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from("questions")
          .select(
            "id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,tip,difficulty,source,source_document,category_id,image_url,legal_reference,is_verified",
          )
          .eq("is_published", true)
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        questions.push(...((data ?? []) as Question[]));
        setDownloadedQuestions(questions.length);
        setProgress(
          totalQuestions === 0
            ? 50
            : Math.round(50 * Math.min(questions.length / totalQuestions, 1)),
        );
        if ((data?.length ?? 0) < 500) break;
      }
      if (questions.length === 0) {
        throw new Error("Não há questões publicadas para guardar.");
      }
      const categories: Category[] = await fetchCategories();
      const urls = [...new Set(questions.flatMap((q) => (q.image_url ? [q.image_url] : [])))];
      setImageTotal(urls.length);
      if (urls.length === 0) setProgress(100);
      const cache = await caches.open(OFFLINE_IMAGE_CACHE);
      let downloaded = 0;
      let failed = 0;
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          if (!response.headers.get("content-type")?.startsWith("image/")) {
            throw new Error("O recurso recebido não é uma imagem.");
          }
          await cache.put(url, response);
          downloaded += 1;
        } catch (error) {
          failed += 1;
          console.warn("[offline] Não foi possível guardar uma imagem:", error);
        } finally {
          setImages(downloaded);
          setFailedImages(failed);
          setProgress(50 + Math.round((50 * (downloaded + failed)) / urls.length));
        }
      }
      const now = new Date();
      const expiresAt = offlinePackExpiry({
        now: now.getTime(),
        launchAccess: plano.status.launchAccess,
        subscriptionExpiresAt:
          plano.status.plan.offline && !plano.status.expired ? plano.status.expiresAt : null,
      });
      const pack = {
        userId: auth.session.user.id,
        tier: "premium" as const,
        subscriptionTier: plano.status.subscriptionTier,
        launchAccess: plano.status.launchAccess,
        expiresAt,
        savedAt: now.toISOString(),
        questions: questions.map((question) => ({
          ...question,
          legal_reference: question.is_verified ? (question.legal_reference ?? null) : null,
        })),
        categories,
        images: downloaded,
        failedImages: failed,
      };
      await savePack(pack);
      trackProductEvent("offline_pack_download", plano.status.tier);
      setCount(questions.length);
      setImages(downloaded);
      setFailedImages(failed);
      setQuestionTotal(questions.length);
      setSavedAt(pack.savedAt);
      setPackExpiresAt(pack.expiresAt);
      setPackIsValid(validPack(pack));
      setProgress(100);
      let syncFailed = false;
      try {
        await flushPendingSessions();
      } catch (error) {
        syncFailed = true;
        console.error(
          "[offline] O pacote foi guardado, mas as sessões não foram sincronizadas:",
          error,
        );
      }
      const queued = await queuedSessions();
      const userQueue = queued.filter((item) => item.user_id === auth.session!.user.id);
      setPendingSessions(userQueue.length);
      setSyncState(syncFailed || userQueue.length > 0 ? "pending" : "synced");
      toast.success(
        `${questions.length} questões guardadas; ${downloaded} imagens guardadas e ${failed} falharam.`,
      );
      if (syncFailed)
        toast.error(
          "O pacote foi guardado, mas os resultados continuam pendentes de sincronização.",
        );
    } catch (error) {
      setSyncState("pending");
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível guardar as questões neste dispositivo.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (plano.loading || session.loading) {
    return (
      <AppShell>
        <div className="surface h-56 animate-pulse rounded-3xl" />
      </AppShell>
    );
  }

  if (started)
    return (
      <AppShell>
        <Button variant="outline" className="mb-5" onClick={() => setStarted(false)}>
          Voltar
        </Button>
        <QuizEngine
          mode="pratica"
          title="Prática offline"
          config={{ count: Math.min(count, 100) }}
        />
      </AppShell>
    );

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-semibold">Modo offline</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Instale a app e mantenha as questões guardadas no dispositivo (computador ou telemóvel). Depois pode
        estudar sem internet; quando a ligação regressar, os resultados pendentes são sincronizados.
      </p>

      <div className="surface mt-6 space-y-4 rounded-3xl p-6">
        <p className="text-sm">
          Estado da ligação:{" "}
          <strong className={online ? "text-primary" : "text-destructive"}>
            {online ? "online" : "offline"}
          </strong>
        </p>
        <p className="text-sm text-muted-foreground">
          {count > 0
            ? `${count} perguntas descarregadas · ${images} imagens guardadas · ${failedImages} imagens falharam${savedAt ? ` · última actualização ${new Date(savedAt).toLocaleString("pt-MZ")}` : ""}.`
            : "Ainda não há questões guardadas neste dispositivo."}
        </p>
        {packExpiresAt && (
          <p className="text-sm text-muted-foreground">
            Pacote válido até {new Date(packExpiresAt).toLocaleDateString("pt-MZ")}.
          </p>
        )}
        {count > 0 && !packIsValid && (
          <p className="text-sm text-destructive" role="status">
            Este pacote já não está válido para estudo offline. Ligue-se à internet e descarregue-o
            novamente para continuar a estudar.
          </p>
        )}
        {(loading || imageTotal > 0) && (
          <div
            role="progressbar"
            aria-label="Progresso do pacote offline"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {imageTotal > 0 && (
          <p className="text-sm text-muted-foreground">
            Progresso do pacote: {downloadedQuestions}/{questionTotal} questões ·{" "}
            {images + failedImages}/{imageTotal} imagens · {progress}%
          </p>
        )}
        {pendingSessions > 0 && (
          <p className="text-sm text-primary">
            {pendingSessions} resultado(s) aguardam sincronização.
          </p>
        )}
        {syncState !== "idle" && (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <RefreshCw className={`h-4 w-4 ${syncState === "syncing" ? "animate-spin" : ""}`} />
            {syncState === "syncing"
              ? "A sincronizar..."
              : syncState === "synced"
                ? "Sincronização concluída."
                : "Sincronização pendente; será tentada novamente quando houver ligação."}
          </p>
        )}
        {session.isAdmin &&
          !plano.status.launchAccess &&
          (!plano.status.plan.offline || plano.status.expired || !plano.status.expiresAt) && (
            <p className="text-xs text-muted-foreground">
              O pacote de administrador é válido por 30 dias após cada sincronização.
            </p>
          )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={loading || !online || !allowed}
            onClick={() => void sync()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CloudDownload className="h-4 w-4" />
            )}
            {count > 0 ? "Sincronizar agora" : "Descarregar questões"}
          </Button>
          {packIsValid && (
            <Button variant="outline" onClick={() => setStarted(true)}>
              <Play />
              Começar a estudar
            </Button>
          )}
          <InstallButton />
        </div>
        {loading && (
          <p role="status" className="text-sm text-muted-foreground">
            A guardar questões e imagens: {downloadedQuestions}/{questionTotal} questões ·{" "}
            {images + failedImages}/{imageTotal} imagens · {progress}%
          </p>
        )}
        {!online && (
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <WifiOff className="h-3.5 w-3.5" /> Sem internet: usa as questões já guardadas.
          </p>
        )}
      </div>
      {!allowed && (
        <div className="mt-5 rounded-2xl border border-border bg-card/70 p-5">
          <p className="text-sm text-muted-foreground">
            O modo offline completo está disponível durante o Acesso Total Gratuito ou no plano Premium.
          </p>
          <Link
            to="/precos"
            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Ver planos
          </Link>
        </div>
      )}
    </AppShell>
  );
}
