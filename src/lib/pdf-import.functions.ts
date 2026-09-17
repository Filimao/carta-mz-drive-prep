import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
// gemini-1.5-flash foi desligado pela Google; usar gemini-3.8-flash (suporta imagens via OpenAI-compatible endpoint).
const MODEL = "gemini-3.8-flash";
const MAX_RATE_LIMIT_RETRIES = 4;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const extractedQuestionSchema = z.object({
  question_text: z.string().min(5),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  correct_answer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().default(""),
  tip: z.string().nullable().default(null),
  difficulty: z.enum(["facil", "medio", "dificil"]).default("medio"),
  category_slug: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).default(0.5),
  image_region: z
    .object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
    .nullable()
    .default(null),
  image_url: z.string().url().nullable().default(null),
});

export type ExtractedQuestion = z.infer<typeof extractedQuestionSchema>;

const SYSTEM = `És um especialista em extrair questões de exame teórico da carta de condução de Moçambique a partir de páginas de PDF (digitalizadas ou com texto).

Devolve SEMPRE um objecto JSON válido com esta forma:
{"questions":[{"question_text":"...","option_a":"...","option_b":"...","option_c":"...","option_d":"...","correct_answer":"A|B|C|D","explanation":"...","tip":null,"difficulty":"facil|medio|dificil","category_slug":null,"confidence":0.0,"image_region":{"x":0.0,"y":0.0,"width":0.3,"height":0.3}}]}

Regras:
- Português de Moçambique, sem alterar o sentido original.
- Se a página não tiver questões, devolve {"questions":[]}.
- A imagem pode ser uma captura de ecrã comprida com várias questões. Lê cada bloco separadamente, de cima para baixo, sem duplicar questões.
- Para cada questão, identifica a fotografia/figura/sinal no lado esquerdo. Devolve sempre image_region com coordenadas relativas à imagem completa, entre 0 e 1, mesmo que aproximada (a região serve para associar a questão à imagem correcta da página). Só devolve null se tiveres a certeza de que o bloco não tem qualquer imagem.
- As alternativas podem ser A-C ou A-D. Se uma alternativa não estiver visível, usa exactamente "[Alternativa não apresentada]" e confiança < 0.6; nunca inventes texto.
- A resposta correcta neste tipo de material costuma estar escrita a verde. Usa essa cor, negrito, sublinhado ou X como evidência; se não for claro, usa confiança < 0.6.
- Transcreve o texto visível com fidelidade, incluindo números, unidades, pontuação e acentos. Não uses o texto da imagem para criar perguntas que não estejam visíveis.
- "explanation": justificação curta (1-2 frases). "tip": dica opcional.
- "category_slug": usa apenas um dos slugs fornecidos, ou null.
- "confidence": 0 a 1, quão fiável foi a leitura desta questão.
- Nunca inventes questões que não estão na página.`;

async function assertAdmin(
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown }>;
  },
  userId: string,
) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Acesso restrito a administradores.");
}

/** Extrai questões de uma única página do PDF (imagem + texto opcional). */
export const extractQuestionsFromPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      imageBase64: string;
      pageText?: string;
      page: number;
      categories: { slug: string; name: string }[];
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);

    const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["Gemini_API_Key"];
    if (!apiKey) throw new Error("Assistente de IA não configurado.");

    const catList =
      data.categories.length > 0
        ? data.categories.map((c) => `${c.slug} (${c.name})`).join(", ")
        : "sem categorias disponíveis";

    const userContent: unknown[] = [
      {
        type: "text",
        text: `Página ${data.page}. Categorias permitidas: ${catList}.

Este PDF é uma captura de ecrã de um teste: cada bloco tem um número, uma pergunta, uma imagem opcional à esquerda e alternativas por baixo. Pode haver duas ou mais questões na mesma página. Lê todos os blocos visíveis de cima para baixo.

Texto extraído do PDF (pode estar vazio ou desordenado):
"""
${(data.pageText ?? "").slice(0, 6000)}
"""

Transcreve exactamente o texto visível. Não confundas o número da questão com uma alternativa, não juntes dois blocos e não dupliques questões. Devolve apenas o JSON pedido.`,
      },
      { type: "image_url", image_url: { url: data.imageBase64 } },
    ];

    let response: Response | undefined;
    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
      response = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: MODEL,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userContent },
          ],
        }),
      });
      if (response.status !== 429 || attempt === MAX_RATE_LIMIT_RETRIES) break;
      const retryAfter = Number(response.headers.get("retry-after"));
      await wait(
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5_000 * (attempt + 1),
      );
    }
    if (!response) throw new Error("Não foi possível contactar a IA.");

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 429)
        throw new Error("Muitos pedidos à IA. Aguarda e retoma a importação.");
      if (response.status === 402)
        throw new Error("Créditos de IA esgotados. Adiciona créditos para continuar a importação.");
      if (response.status === 403)
        throw new Error("A IA está bloqueada nas configurações do espaço de trabalho.");
      throw new Error(`Falha da IA (${response.status}): ${body.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      const json = raw.replace(/^```(?:json)?\s*|```$/gi, "").trim();
      const start = json.indexOf("{");
      const end = json.lastIndexOf("}");
      if (start < 0 || end <= start) throw new Error("JSON ausente");
      parsed = JSON.parse(json.slice(start, end + 1));
    } catch {
      throw new Error("A IA devolveu um formato inesperado nesta página.");
    }

    const list = (parsed as { questions?: unknown[] }).questions ?? [];
    const questions: ExtractedQuestion[] = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const candidate = item as Record<string, unknown>;
      const missingOption = ["option_a", "option_b", "option_c", "option_d"].some(
        (key) =>
          typeof candidate[key] !== "string" ||
          (candidate[key] as string | undefined)?.trim() === "",
      );
      const normalized = {
        ...candidate,
        option_a: candidate["option_a"] || "[Alternativa não apresentada]",
        option_b: candidate["option_b"] || "[Alternativa não apresentada]",
        option_c: candidate["option_c"] || "[Alternativa não apresentada]",
        option_d: candidate["option_d"] || "[Alternativa não apresentada]",
        confidence: missingOption
          ? Math.min(
              typeof candidate["confidence"] === "number"
                ? (candidate["confidence"] as number)
                : 0.5,
              0.59,
            )
          : candidate["confidence"],
        image_region: candidate["image_region"] ?? null,
        image_url: null,
      };
      const result = extractedQuestionSchema.safeParse(normalized);
      if (result.success) questions.push(result.data);
    }
    return { page: data.page, questions };
  });

const saveSchema = z.object({
  importId: z.string().uuid(),
  sourceDocument: z.string(),
  questions: z.array(
    extractedQuestionSchema.extend({
      page: z.number().int().nonnegative(),
      category_id: z.string().uuid().nullable().default(null),
    }),
  ),
});

/** Guarda as questões revistas. Baixa confiança fica como "revisão necessária" e não publicada. */
export const saveImportedQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);

    const rows = data.questions.map((q) => {
      const lowConfidence = q.confidence < 0.75;
      return {
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        tip: q.tip,
        difficulty: q.difficulty,
        category_id: q.category_id,
        source: "PDF" as const,
        source_document: data.sourceDocument,
        source_page: q.page,
        import_id: data.importId,
        image_url: q.image_url,
        needs_review: lowConfidence,
        is_published: !lowConfidence,
        is_verified: false,
      };
    });

    if (rows.length === 0) return { inserted: 0, needsReview: 0 };

    const { error } = await context.supabase.from("questions").insert(rows);
    if (error) throw new Error(error.message);

    return {
      inserted: rows.length,
      needsReview: rows.filter((r) => r.needs_review).length,
    };
  });
