import { createFileRoute } from "@tanstack/react-router";

const INDEXABLE_PATHS = [
  "/",
  "/mini-teste",
  "/precos",
  "/sinais",
  "/auth",
  "/praticar",
  "/simulados",
] as const;

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        const urls = INDEXABLE_PATHS.map(
          (path) => `  <url><loc>${new URL(path, origin).href}</loc></url>`,
        ).join("\n");
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
          {
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=3600",
            },
          },
        );
      },
    },
  },
});
