import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

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
});

export type ExtractedQuestion = z.infer<typeof extractedQuestionSchema>;

const SYSTEM = `És um especialista em extrair questões de exame teórico da carta de condução de Moçambique a partir de páginas de PDF (digitalizadas ou com texto).

Devolve SEMPRE um objecto JSON válido com esta forma:
{"questions":[{"question_text":"...","option_a":"...","option_b":"...","option_c":"...","option_d":"...","correct_answer":"A|B|C|D","explanation":"...","tip":null,"difficulty":"facil|medio|dificil","category_slug":null,"confidence":0.0}]}

Regras:
- Português de Moçambique, sem alterar o sentido original.
- Se a página não tiver questões, devolve {"questions":[]}.
- Se faltarem alternativas, completa de forma plausível e baixa a confiança (< 0.6).
- A resposta correcta pode estar assinalada a verde, em negrito, sublinhada ou marcada com X. Se não for claro, escolhe a mais provável e usa confiança < 0.6.
- "explanation": justificação curta (1-2 frases). "tip": dica opcional.
- "category_slug": usa apenas um dos slugs fornecidos, ou null.
- "confidence": 0 a 1, quão fiável foi a leitura desta questão.
- Nunca inventes questões que não estão na página.`;

async function assertAdmin(supabase: {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown }>;
}, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Acesso restrito a administradores.");
}

/** Extrai questões de uma única página do PDF (imagem + texto opcional). */
export const extractQuestionsFromPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    imageBase64: string;
    pageText?: string;
    page: number;
    categories: { slug: string; name: string }[];
  }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Assistente de IA não configurado.");

    const catList =
      data.categories.length > 0
        ? data.categories.map((c) => `${c.slug} (${c.name})`).join(", ")
        : "sem categorias disponíveis";

    const userContent: unknown[] = [
      {
        type: "text",
        text: `Página ${data.page}. Categorias permitidas: ${catList}.\n\nTexto extraído do PDF (pode estar vazio se for digitalizado):\n"""\n${(data.pageText ?? "").slice(0, 6000)}\n"""\n\nAnalisa a imagem da página e devolve o JSON pedido.`,
      },
      { type: "image_url", image_url: { url: data.imageBase64 } },
    ];

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 429) throw new Error("Muitos pedidos à IA. Aguarda e retoma a importação.");
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
      parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim());
    } catch {
      throw new Error("A IA devolveu um formato inesperado nesta página.");
    }

    const list = (parsed as { questions?: unknown[] }).questions ?? [];
    const questions: ExtractedQuestion[] = [];
    for (const item of list) {
      const result = extractedQuestionSchema.safeParse(item);
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
