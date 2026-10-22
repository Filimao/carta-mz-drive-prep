import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `És o "Instrutor Fácil", assistente do Carta MZ Quiz — uma app de preparação para o exame teórico da carta de condução em Moçambique.

Regras:
- Responde sempre em português de Moçambique, de forma curta, clara e amigável.
- Explica sinais de trânsito, regras de prioridade, velocidades, documentos e boas práticas de condução.
- Usa as ferramentas disponíveis para buscar questões reais da app, procurar temas ou explicar os planos.
- Quando mostras uma questão, apresenta as 4 alternativas e só revelas a resposta certa depois de o utilizador tentar (ou se ele pedir).
- Se não souberes, diz que não sabes e sugere praticar a categoria relevante.
- Nunca inventes referências legais nem números de artigos. Só menciona uma referência legal quando vier explicitamente numa questão publicada e tiver sido confirmada pela administração.
- Nunca prometas resultados oficiais: a Carta MZ Quiz é uma ferramenta de estudo independente e não representa o INATRO.`;

function serverSupabase() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase não configurado");
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

const QUESTION_COLUMNS =
  "question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,tip,difficulty";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["Gemini_API_Key"];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Assistente não configurado." }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        let messages: UIMessage[] = [];
        try {
          const body = (await request.json()) as { messages?: UIMessage[] };
          messages = body.messages ?? [];
        } catch {
          return new Response("Pedido inválido", { status: 400 });
        }

        const gateway = createLovableAiGatewayProvider(apiKey);

        const result = streamText({
          model: gateway("gemini-3.8-flash"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
          stopWhen: stepCountIs(50),
          providerOptions: { gemini: { max_tokens: 1200 } },
          tools: {
            questaoAleatoria: tool({
              description:
                "Devolve uma questão aleatória do banco de questões da app, opcionalmente por dificuldade.",
              inputSchema: z.object({
                dificuldade: z.enum(["facil", "medio", "dificil", "todas"]).optional(),
              }),
              execute: async ({ dificuldade }) => {
                const supabase = serverSupabase();
                let query = supabase
                  .from("questions")
                  .select(QUESTION_COLUMNS)
                  .eq("is_published", true);
                if (dificuldade && dificuldade !== "todas")
                  query = query.eq("difficulty", dificuldade);
                const { data, error } = await query.limit(200);
                if (error) return { erro: "Não foi possível buscar questões." };
                const rows = data ?? [];
                if (rows.length === 0) return { erro: "Sem questões disponíveis." };
                return rows[Math.floor(Math.random() * rows.length)]!;
              },
            }),
            procurarQuestoes: tool({
              description:
                "Procura questões da app por palavra-chave (ex: 'álcool', 'stop', 'rotunda').",
              inputSchema: z.object({ termo: z.string() }),
              execute: async ({ termo }) => {
                const supabase = serverSupabase();
                const { data, error } = await supabase
                  .from("questions")
                  .select(QUESTION_COLUMNS)
                  .eq("is_published", true)
                  .ilike("question_text", `%${termo}%`)
                  .limit(5);
                if (error) return { erro: "Pesquisa indisponível." };
                return { total: (data ?? []).length, questoes: data ?? [] };
              },
            }),
            listarCategorias: tool({
              description: "Lista as categorias de estudo disponíveis na app.",
              inputSchema: z.object({}),
              execute: async () => {
                const supabase = serverSupabase();
                const { data, error } = await supabase
                  .from("categories")
                  .select("name,description")
                  .order("sort_order");
                if (error) return { erro: "Categorias indisponíveis." };
                return data ?? [];
              },
            }),
            infoPlanos: tool({
              description:
                "Explica os planos e preços da app (Free, Pro 97 MT, Premium 180 MT) e os limites de cada um.",
              inputSchema: z.object({}),
              execute: async () => ({
                free: {
                  preco: "0 MT",
                  questoesPorSessao: 15,
                  sessoesPorDia: 3,
                  simulado: 20,
                },
                pro: {
                  preco: "97 MT/mês",
                  questoesPorSessao: 50,
                  sessoesPorDia: "ilimitadas",
                  simulado: 50,
                  extras: "revisão inteligente",
                },
                premium: {
                  preco: "180 MT/mês",
                  questoesPorSessao: 100,
                  simulado: 100,
                  extras: "estatísticas avançadas, modo offline, apoio prioritário",
                },
                pagamento: "M-Pesa 879132543 ou e-Mola 850147162, confirmação manual em /precos",
              }),
            }),
          },
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
