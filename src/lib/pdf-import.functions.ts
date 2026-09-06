import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

/**
 * Modelo principal para OCR.
 *
 * Gemini 3.6 Flash:
 * - multimodal
 * - rápido
 * - bom para documentos/imagens
 * - suporta structured output
 */
const MODEL = "gemini-3.6-flash";

const MAX_PAGE_TEXT = 8000;
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_QUESTIONS_PER_PAGE = 30;

/**
 * Schema final utilizado pelo restante da aplicação.
 */
const extractedQuestionSchema = z.object({
  question_text: z.string().min(5),

  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),

  correct_answer: z.enum(["A", "B", "C", "D"]),

  explanation: z.string().default(""),

  tip: z.string().nullable().default(null),

  difficulty: z
    .enum(["facil", "medio", "dificil"])
    .default("medio"),

  category_slug: z
    .string()
    .nullable()
    .default(null),

  confidence: z
    .number()
    .min(0)
    .max(1)
    .default(0.5),

  image_region: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      width: z.number().min(0).max(1),
      height: z.number().min(0).max(1),
    })
    .nullable()
    .default(null),

  image_url: z
    .string()
    .url()
    .nullable()
    .default(null),
});

export type ExtractedQuestion =
  z.infer<typeof extractedQuestionSchema>;

/**
 * Schema da resposta da IA.
 *
 * É mantido separado do schema final porque a IA
 * também devolve needs_review.
 */
const aiQuestionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    question_text: {
      type: "string",
      description:
        "Texto exato da pergunta visível na página.",
    },

    option_a: {
      type: "string",
      description:
        "Alternativa A. Se não estiver visível, usar [Alternativa não apresentada].",
    },

    option_b: {
      type: "string",
      description:
        "Alternativa B. Se não estiver visível, usar [Alternativa não apresentada].",
    },

    option_c: {
      type: "string",
      description:
        "Alternativa C. Se não estiver visível, usar [Alternativa não apresentada].",
    },

    option_d: {
      type: "string",
      description:
        "Alternativa D. Se não estiver visível, usar [Alternativa não apresentada].",
    },

    correct_answer: {
      type: "string",
      enum: ["A", "B", "C", "D"],
      description:
        "Resposta correta somente quando houver evidência visual clara.",
    },

    explanation: {
      type: "string",
      description:
        "Explicação curta baseada somente no material.",
    },

    tip: {
      type: ["string", "null"],
      description:
        "Dica curta opcional.",
    },

    difficulty: {
      type: "string",
      enum: ["facil", "medio", "dificil"],
    },

    category_slug: {
      type: ["string", "null"],
    },

    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },

    image_region: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        x: {
          type: "number",
          minimum: 0,
          maximum: 1,
        },

        y: {
          type: "number",
          minimum: 0,
          maximum: 1,
        },

        width: {
          type: "number",
          minimum: 0,
          maximum: 1,
        },

        height: {
          type: "number",
          minimum: 0,
          maximum: 1,
        },
      },
      required: [
        "x",
        "y",
        "width",
        "height",
      ],
    },

    needs_review: {
      type: "boolean",
    },
  },

  required: [
    "question_text",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_answer",
    "explanation",
    "tip",
    "difficulty",
    "category_slug",
    "confidence",
    "image_region",
    "needs_review",
  ],
};

const aiResponseSchema = {
  type: "object",
  additionalProperties: false,

  properties: {
    questions: {
      type: "array",
      items: aiQuestionSchema,
      description:
        "Todas as questões identificadas na página, de cima para baixo.",
    },
  },

  required: ["questions"],
};

/**
 * Prompt especializado para OCR de exames
 * de condução de Moçambique.
 */
const SYSTEM = `
És um especialista em OCR, visão computacional e
extração de questões de exames teóricos da carta
de condução de Moçambique.

A tua tarefa é TRANSCRIBIR e ESTRUTURAR o conteúdo
visível de uma página de exame.

REGRAS ABSOLUTAS:

1. NÃO INVENTES QUESTÕES.

2. NÃO INVENTES ALTERNATIVAS.

3. NÃO INVENTES RESPOSTAS.

4. NÃO COMPLETES texto que não esteja visível.

5. Se uma parte estiver ilegível, preserve o que
   conseguir ler e reduza a confiança.

6. Se uma alternativa não estiver visível, escreva
   exatamente:

   [Alternativa não apresentada]

7. A resposta correta só deve ser marcada quando
   houver evidência suficiente na própria página.

8. Se a resposta correta estiver destacada por:
   - cor verde
   - negrito
   - sublinhado
   - X
   - marcação
   - círculo
   - indicação textual

   use essa evidência.

9. Se não for possível determinar a resposta,
   ainda assim é obrigatório devolver A/B/C/D.
   Nesse caso:
   - escolha a opção visualmente mais provável
     SOMENTE se existir evidência;
   - confidence deve ser inferior a 0.60;
   - needs_review deve ser true.

10. Nunca use conhecimento externo para transformar
    uma resposta incerta em certeza.

11. Português de Moçambique.

12. Preserve:
    - acentos;
    - números;
    - unidades;
    - percentagens;
    - sinais;
    - pontuação;
    - referências legais;
    - velocidades;
    - distâncias.

13. Tenha atenção especial aos erros comuns de OCR:

    0 ↔ O
    1 ↔ I ↔ l
    5 ↔ S
    8 ↔ B
    2 ↔ Z
    6 ↔ G

14. NÃO corrija automaticamente números.

15. Se houver uma fotografia, placa ou sinal de trânsito,
    associe a região visual à questão correspondente.

16. image_region usa coordenadas relativas à imagem inteira:

    x = posição horizontal / largura
    y = posição vertical / altura
    width = largura / largura total
    height = altura / altura total

    Todos os valores devem estar entre 0 e 1.

17. Se não existir imagem associada à questão:
    image_region = null.

18. Não duplique questões.

19. Leia de cima para baixo.

20. Se uma questão continuar na página seguinte,
    NÃO invente a continuação.

21. Se a página não possuir nenhuma questão:
    devolva questions = [].

22. A explicação deve ser curta.
    Não invente legislação.

23. difficulty:
    - facil: questão direta;
    - medio: exige interpretação;
    - dificil: exige vários elementos.

24. category_slug deve ser SOMENTE um dos slugs
    fornecidos pelo sistema ou null.

25. confidence:
    0.90-1.00 = leitura muito clara
    0.75-0.89 = pequena incerteza
    0.60-0.74 = necessita revisão
    0.00-0.59 = baixa confiança

26. Se houver qualquer dúvida relevante:
    needs_review = true.

27. A saída DEVE obedecer exatamente ao JSON Schema.
`;

/**
 * Verifica se o utilizador é administrador.
 */
async function assertAdmin(
  supabase: {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{
      data: unknown;
      error?: unknown;
    }>;
  },
  userId: string,
) {
  const { data } = await supabase.rpc(
    "has_role",
    {
      _user_id: userId,
      _role: "admin",
    },
  );

  if (data !== true) {
    throw new Error(
      "Acesso restrito a administradores.",
    );
  }
}

/**
 * Fetch com timeout.
 *
 * Evita uma página ficar presa indefinidamente
 * quando a API da IA demora.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      timeoutMs,
    );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "Tempo limite da IA excedido. A página será reprocessada automaticamente.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Normaliza a resposta recebida.
 */
function normalizeQuestion(
  item: unknown,
): ExtractedQuestion | null {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return null;
  }

  const candidate =
    item as Record<string, unknown>;

  const optionPlaceholder =
    "[Alternativa não apresentada]";

  const optionA =
    typeof candidate.option_a ===
    "string" &&
    candidate.option_a.trim()
      ? candidate.option_a.trim()
      : optionPlaceholder;

  const optionB =
    typeof candidate.option_b ===
    "string" &&
    candidate.option_b.trim()
      ? candidate.option_b.trim()
      : optionPlaceholder;

  const optionC =
    typeof candidate.option_c ===
    "string" &&
    candidate.option_c.trim()
      ? candidate.option_c.trim()
      : optionPlaceholder;

  const optionD =
    typeof candidate.option_d ===
    "string" &&
    candidate.option_d.trim()
      ? candidate.option_d.trim()
      : optionPlaceholder;

  const missingOption =
    [
      optionA,
      optionB,
      optionC,
      optionD,
    ].some(
      (value) =>
        value ===
        optionPlaceholder,
    );

  let confidence =
    typeof candidate.confidence ===
    "number"
      ? candidate.confidence
      : 0.5;

  confidence = Math.max(
    0,
    Math.min(1, confidence),
  );

  if (missingOption) {
    confidence = Math.min(
      confidence,
      0.59,
    );
  }

  /**
   * Se a IA diz que precisa de revisão,
   * nunca permitimos confiança alta.
   */
  if (
    candidate.needs_review ===
    true
  ) {
    confidence = Math.min(
      confidence,
      0.74,
    );
  }

  const normalized = {
    ...candidate,

    question_text:
      typeof candidate.question_text ===
      "string"
        ? candidate.question_text.trim()
        : "",

    option_a: optionA,
    option_b: optionB,
    option_c: optionC,
    option_d: optionD,

    confidence,

    image_region:
      candidate.image_region ??
      null,

    image_url: null,

    tip:
      candidate.tip === null ||
      typeof candidate.tip ===
        "string"
        ? candidate.tip
        : null,
  };

  const result =
    extractedQuestionSchema.safeParse(
      normalized,
    );

  if (!result.success) {
    return null;
  }

  return result.data;
}

/**
 * Remove respostas repetidas dentro da mesma página.
 */
function deduplicateQuestions(
  questions: ExtractedQuestion[],
) {
  const seen = new Set<string>();

  return questions.filter(
    (question) => {
      const key =
        question.question_text
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    },
  );
}

/**
 * Extrai questões de uma única página.
 */
export const extractQuestionsFromPage =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])

    .inputValidator(
      (input: {
        imageBase64: string;
        pageText?: string;
        page: number;
        categories: {
          slug: string;
          name: string;
        }[];
      }) => input,
    )

    .handler(
      async ({
        data,
        context,
      }) => {
        await assertAdmin(
          context.supabase as never,
          context.userId,
        );

        const apiKey =
          process.env[
            "GEMINI_API_KEY"
          ] ??
          process.env[
            "Gemini_API_Key"
          ];

        if (!apiKey) {
          throw new Error(
            "Assistente de IA não configurado. Configure GEMINI_API_KEY no ambiente do servidor.",
          );
        }

        if (
          !data.imageBase64 ||
          !data.imageBase64.startsWith(
            "data:image/",
          )
        ) {
          throw new Error(
            "Imagem da página inválida.",
          );
        }

        const catList =
          data.categories.length >
          0
            ? data.categories
                .map(
                  (category) =>
                    `${category.slug} (${category.name})`,
                )
                .join(", ")
            : "sem categorias disponíveis";

        const pageText =
          (
            data.pageText ??
            ""
          ).slice(
            0,
            MAX_PAGE_TEXT,
          );

        const userPrompt = `
Página ${data.page}.

CATEGORIAS PERMITIDAS:
${catList}

TEXTO EXTRAÍDO PELO PDF:
"""
${pageText}
"""

INSTRUÇÕES ESPECÍFICAS:

- Usa a imagem como fonte visual principal.
- Usa o texto PDF como apoio.
- Se houver conflito entre texto e imagem,
  privilegia a imagem.
- Lê todas as questões de cima para baixo.
- Não dupliques questões.
- Não inventes conteúdo.
- Analisa cuidadosamente as marcações de resposta.
- Verifica números e sinais de trânsito.
- Se houver baixa qualidade, reduz confidence.
- Se não houver questões, devolve [].

Extrai agora todas as questões visíveis.
`;

        const userContent = [
          {
            type: "text",
            text: userPrompt,
          },
          {
            type: "image_url",
            image_url: {
              url: data.imageBase64,
            },
          },
        ];

        const body = {
          model: MODEL,

          messages: [
            {
              role: "system",
              content: SYSTEM,
            },

            {
              role: "user",
              content: userContent,
            },
          ],

          /**
           * Structured Output.
           *
           * Isto é muito mais seguro do que
           * simplesmente pedir json_object.
           */
          response_format: {
            type: "json_schema",

            json_schema: {
              name:
                "driving_exam_page",

              strict: true,

              schema:
                aiResponseSchema,
            },
          },

          /**
           * OCR deve ser determinístico.
           */
          temperature: 0.1,

          /**
           * Evita respostas gigantes.
           */
          max_tokens: 12000,
        };

        let response: Response;

        try {
          response =
            await fetchWithTimeout(
              GATEWAY_URL,
              {
                method: "POST",

                headers: {
                  "content-type":
                    "application/json",

                  Authorization:
                    `Bearer ${apiKey}`,
                },

                body: JSON.stringify(
                  body,
                ),
              },
            );
        } catch (error) {
          throw new Error(
            error instanceof Error
              ? error.message
              : "Falha de ligação à IA.",
          );
        }

        if (!response.ok) {
          const bodyText =
            await response.text();

          if (
            response.status ===
            400
          ) {
            throw new Error(
              `Pedido inválido à IA. Verifica o modelo/Structured Output. ${bodyText.slice(
                0,
                300,
              )}`,
            );
          }

          if (
            response.status ===
            401
          ) {
            throw new Error(
              "Chave GEMINI_API_KEY inválida.",
            );
          }

          if (
            response.status ===
            403
          ) {
            throw new Error(
              "A API Gemini recusou o pedido. Verifica a chave, projeto e permissões.",
            );
          }

          if (
            response.status ===
            404
          ) {
            throw new Error(
              `Modelo Gemini não encontrado: ${MODEL}.`,
            );
          }

          if (
            response.status ===
            429
          ) {
            throw new Error(
              "Limite da API Gemini atingido. Aguarda alguns segundos e retoma.",
            );
          }

          if (
            response.status ===
            402
          ) {
            throw new Error(
              "Créditos de IA esgotados. Adiciona créditos para continuar.",
            );
          }

          if (
            response.status >=
            500
          ) {
            throw new Error(
              "O serviço Gemini está temporariamente indisponível. A página será reprocessada.",
            );
          }

          throw new Error(
            `Falha da IA (${response.status}): ${bodyText.slice(
              0,
              300,
            )}`,
          );
        }

        const payload =
          (await response.json()) as {
            choices?: Array<{
              message?: {
                content?:
                  | string
                  | null;
              };
            }>;
          };

        const raw =
          payload.choices?.[0]
            ?.message
            ?.content ??
          "";

        if (!raw) {
          throw new Error(
            "A IA não devolveu conteúdo.",
          );
        }

        let parsed: unknown;

        try {
          parsed =
            JSON.parse(raw);
        } catch {
          /**
           * Fallback para respostas antigas
           * que eventualmente venham com markdown.
           */
          try {
            const cleaned =
              raw
                .replace(
                  /^```(?:json)?\s*/i,
                  "",
                )
                .replace(
                  /\s*```$/i,
                  "",
                )
                .trim();

            parsed =
              JSON.parse(cleaned);
          } catch {
            throw new Error(
              "A IA devolveu um JSON inválido. A página será reprocessada.",
            );
          }
        }

        if (
          !parsed ||
          typeof parsed !==
            "object"
        ) {
          throw new Error(
            "Formato de resposta inválido.",
          );
        }

        const rawQuestions =
          (
            parsed as {
              questions?: unknown;
            }
          ).questions;

        if (
          !Array.isArray(
            rawQuestions,
          )
        ) {
          throw new Error(
            "A resposta da IA não contém a lista de questões.",
          );
        }

        const questions =
          deduplicateQuestions(
            rawQuestions
              .slice(
                0,
                MAX_QUESTIONS_PER_PAGE,
              )
              .map(
                normalizeQuestion,
              )
              .filter(
                (
                  question,
                ): question is ExtractedQuestion =>
                  question !==
                  null,
              ),
          );

        return {
          page: data.page,
          questions,
        };
      },
    );

/**
 * Schema para guardar as questões.
 */
const saveSchema = z.object({
  importId:
    z.string().uuid(),

  sourceDocument:
    z.string(),

  questions:
    z.array(
      extractedQuestionSchema.extend(
        {
          page:
            z.number()
              .int()
              .nonnegative(),

          category_id:
            z.string()
              .uuid()
              .nullable()
              .default(
                null,
              ),
        },
      ),
    ),
});

/**
 * Guarda as questões revistas.
 *
 * Questões com confiança inferior a 75%
 * ficam automaticamente em revisão.
 */
export const saveImportedQuestions =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])

    .inputValidator(
      (input: unknown) =>
        saveSchema.parse(
          input,
        ),
    )

    .handler(
      async ({
        data,
        context,
      }) => {
        await assertAdmin(
          context.supabase as never,
          context.userId,
        );

        const rows =
          data.questions.map(
            (question) => {
              const lowConfidence =
                question.confidence <
                0.75;

              const hasMissingOption =
                [
                  question.option_a,
                  question.option_b,
                  question.option_c,
                  question.option_d,
                ].some(
                  (option) =>
                    option ===
                    "[Alternativa não apresentada]",
                );

              const needsReview =
                lowConfidence ||
                hasMissingOption;

              return {
                question_text:
                  question.question_text,

                option_a:
                  question.option_a,

                option_b:
                  question.option_b,

                option_c:
                  question.option_c,

                option_d:
                  question.option_d,

                correct_answer:
                  question.correct_answer,

                explanation:
                  question.explanation,

                tip:
                  question.tip,

                difficulty:
                  question.difficulty,

                category_id:
                  question.category_id,

                source:
                  "PDF" as const,

                source_document:
                  data.sourceDocument,

                source_page:
                  question.page,

                import_id:
                  data.importId,

                image_url:
                  question.image_url,

                needs_review:
                  needsReview,

                is_published:
                  !needsReview,

                is_verified:
                  false,
              };
            },
          );

        if (
          rows.length ===
          0
        ) {
          return {
            inserted: 0,
            needsReview: 0,
          };
        }

        const {
          error,
        } =
          await context.supabase
            .from("questions")
            .insert(rows);

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return {
          inserted:
            rows.length,

          needsReview:
            rows.filter(
              (row) =>
                row.needs_review,
            ).length,
        };
      },
    );
