import { Download } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setEvent(null);
  }

  // Só expõe o botão quando o navegador tem realmente um prompt de instalação.
  return {
    canInstall: !installed && event != null,
    promptAvailable: event != null,
    installed,
    install,
  };
}

export function InstallButton({ className }: { className?: string }) {
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <button
      type="button"
      onClick={() => void install()}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold"
      }
    >
      <Download className="h-4 w-4" />
      Instalar app
    </button>
  );
}

export function InstallBanner() {
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  if (!canInstall || dismissed) return null;
  return (
    <div className="surface mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
      <p className="text-sm font-semibold">
        Instale o Carta MZ Quiz no seu telemóvel e estude mesmo sem internet.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void install()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
        >
          Mais tarde
        </button>
      </div>
    </div>
  );
}
