import { createFileRoute } from "@tanstack/react-router";
import { CloudDownload, Loader2, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ExpiredBanner, UpgradeRequired } from "@/components/PlanGate";
import { InstallButton } from "@/components/PwaInstall";
import { usePlano } from "@/hooks/usePlano";
import { supabase } from "@/integrations/supabase/client";

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

const CACHE_KEY = "carta-mz-offline-questions-v1";

function Offline() {
  const plano = usePlano();
  const allowed = plano.status.plan.offline && !plano.status.expired;
  const [count, setCount] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { savedAt: string; questions: unknown[] };
        setCount(parsed.questions.length);
        setSavedAt(parsed.savedAt);
      }
    } catch {
      /* ignore */
    }
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function sync() {
    setLoading(true);
    const { data, error } = await supabase
      .from("questions")
      .select(
        "id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,tip,difficulty,source,category_id",
      )
      .eq("is_published", true)
      .limit(2000);
    setLoading(false);
    if (error || !data) {
      toast.error("Não foi possível descarregar as questões.");
      return;
    }
    const payload = { savedAt: new Date().toISOString(), questions: data };
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      toast.error("Sem espaço no dispositivo para guardar as questões.");
      return;
    }
    setCount(data.length);
    setSavedAt(payload.savedAt);
    toast.success(`${data.length} questões guardadas no dispositivo. Continua assim!`);
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
            ? `${count} questões guardadas${savedAt ? ` · última sincronização ${new Date(savedAt).toLocaleString("pt-PT")}` : ""}.`
            : "Ainda não há questões guardadas neste dispositivo."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading || !online}
            onClick={() => void sync()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}
            {count > 0 ? "Sincronizar agora" : "Descarregar questões"}
          </button>
          <InstallButton />
        </div>
        {!online && (
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <WifiOff className="h-3.5 w-3.5" /> Sem internet: usa as questões já guardadas.
          </p>
        )}
      </div>
    </AppShell>
  );
}
