import { createFileRoute } from "@tanstack/react-router";
import { CloudDownload, Loader2, WifiOff, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ExpiredBanner, UpgradeRequired } from "@/components/PlanGate";
import { InstallButton } from "@/components/PwaInstall";
import { usePlano } from "@/hooks/usePlano";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { QuizEngine } from "@/components/QuizEngine";
import { loadPack, savePack, validPack, OFFLINE_IMAGE_CACHE } from "@/lib/offline-store";
import { flushPendingSessions, type Question } from "@/lib/quiz";

export const Route = createFileRoute("/offline")({
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
  const allowed = plano.status.plan.offline && !plano.status.expired;
  const [count, setCount] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [images, setImages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const pack = await loadPack(data.session.user.id);
      if (validPack(pack)) { setCount(pack.questions.length); setSavedAt(pack.savedAt); setImages(pack.images); }
    }).catch(() => {});
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function sync() {
    setLoading(true);
    setProgress(0);
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session || !allowed || !plano.status.expiresAt) throw new Error("É necessário um plano Premium activo.");
      const questions: Question[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("questions").select("id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,tip,difficulty,source,source_document,category_id,image_url,legal_reference,is_verified").eq("is_published", true).order("id").range(offset, offset + 499);
        if (error) throw error;
        questions.push(...(data ?? []) as Question[]);
        if ((data?.length ?? 0) < 500) break;
      }
      const urls = [...new Set(questions.flatMap((q) => q.image_url ? [q.image_url] : []))];
      const cache = await caches.open(OFFLINE_IMAGE_CACHE);
      let downloaded = 0;
      for (const url of urls) {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Uma fotografia não pôde ser descarregada. Tenta sincronizar novamente.");
        await cache.put(url, response);
        downloaded += 1;
        setProgress(Math.round(downloaded / urls.length * 100));
      }
      const pack = { userId: auth.session.user.id, expiresAt: plano.status.expiresAt, savedAt: new Date().toISOString(), questions, images: downloaded };
      await savePack(pack);
      await flushPendingSessions();
      setCount(questions.length); setImages(downloaded); setSavedAt(pack.savedAt); setProgress(100);
      toast.success(`${questions.length} questões e ${downloaded} fotografias guardadas.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar as questões neste dispositivo.");
    } finally {
      setLoading(false);
    }
  }

  if (plano.loading) {
    return (
      <AppShell>
        <div className="surface h-56 animate-pulse rounded-3xl" />
      </AppShell>
    );
  }

  if (!allowed) {
    return (
      <AppShell>
        {plano.status.expired && <ExpiredBanner />}
        <UpgradeRequired feature="Modo offline completo" plan="Premium" />
      </AppShell>
    );
  }

  if (started) return <AppShell><Button variant="outline" className="mb-5" onClick={() => setStarted(false)}>Voltar</Button><QuizEngine mode="pratica" title="Prática offline" config={{ count: Math.min(count, 100) }} /></AppShell>;

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-semibold">Modo offline</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Instala a app e guarda as questões no telemóvel. Depois podes estudar sem internet — quando
        voltares a ficar online, sincroniza para receber as questões novas.
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
            ? `${count} questões · ${images} fotografias${savedAt ? ` · última sincronização ${new Date(savedAt).toLocaleString("pt-PT")}` : ""}.`
            : "Ainda não há questões guardadas neste dispositivo."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={loading || !online}
            onClick={() => void sync()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}
            {count > 0 ? "Sincronizar agora" : "Descarregar questões"}
          </Button>
          {count > 0 && <Button variant="outline" onClick={() => setStarted(true)}><Play />Começar a estudar</Button>}
          <InstallButton />
        </div>
        {loading && <p role="status" className="text-sm text-muted-foreground">A guardar fotografias: {progress}%</p>}
        {!online && (
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <WifiOff className="h-3.5 w-3.5" /> Sem internet: usa as questões já guardadas.
          </p>
        )}
      </div>
    </AppShell>
  );
}
