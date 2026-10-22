// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        devOptions: { enabled: false },
        manifest: {
          name: "Carta MZ Quiz",
          short_name: "Carta MZ",
          description: "Quiz para preparação da carta de condução em Moçambique",
          theme_color: "#0B1220",
          background_color: "#0B1220",
          display: "standalone",
          start_url: "/",
          scope: "/",
          orientation: "portrait-primary",
          categories: ["education", "productivity"],
          screenshots: [
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              form_factor: "narrow"
            }
          ],
          icons: [
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        },
        workbox: {
          navigateFallback: null,
          globPatterns: ["**/*.{js,css,png,jpg,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/~oauth") && !url.pathname.startsWith("/api") && !url.pathname.startsWith("/_serverFn"),
              handler: "NetworkFirst",
              options: { cacheName: "carta-mz-pages", networkTimeoutSeconds: 4, expiration: { maxEntries: 30 } },
            },
            {
              urlPattern: ({ url }) => url.origin === self.location.origin && /\/assets\/.*-[\w-]+\.(js|css)$/.test(url.pathname),
              handler: "CacheFirst",
              options: { cacheName: "carta-mz-assets", expiration: { maxEntries: 250 } },
            },
            {
              urlPattern: ({ request, url }) =>
                request.destination === "image" ||
                url.pathname.includes("/storage/v1/object/public/question-images/"),
              handler: "CacheFirst",
              options: { cacheName: "carta-mz-question-images-v1", expiration: { maxEntries: 2500 } },
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                }
              }
            }
          ]
        }
      })
    ]
  }
});
