export function isPreviewContext(host: string): boolean {
  return (
    /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i.test(host) ||
    /(^|[.-])preview([.-]|$)/i.test(host)
  );
}

export async function registerAppWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const host = location.hostname;
  const refused = !import.meta.env.PROD || window.self !== window.top ||
    isPreviewContext(host) ||
    /(^|\.)(lovableproject\.com|lovableproject-dev\.com|beta\.lovable\.dev)$/.test(host) ||
    new URLSearchParams(location.search).get("sw") === "off";
  if (refused) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((r) => [r.active,r.waiting,r.installing].some((w) => w && new URL(w.scriptURL).pathname === "/sw.js")).map((r) => r.unregister()));
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}