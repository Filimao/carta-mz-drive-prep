import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const sitemap = new URL("/sitemap.xml", request.url).href;
        const content = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /categorias",
          "Disallow: /erros",
          "Disallow: /estatisticas",
          "Disallow: /favoritos",
          "Disallow: /offline",
          "Disallow: /praticar",
          "Disallow: /precos",
          "Disallow: /progresso",
          "Disallow: /sinais",
          "Disallow: /simulados",
          `Sitemap: ${sitemap}`,
          "",
        ].join("\n");
        return new Response(content, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
