import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * ============================================================
 * CONFIGURAÇÃO GEMINI
 * ============================================================
 */

const GATEWAY_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

/**
 * Modelo utilizado para OCR multimodal.
 */
const MODEL = "gemini-3.6-flash";

/**
 * Limite do texto nativo extraído do PDF.
 */
const MAX_PAGE_TEXT = 8000;

/**
 * Timeout máximo de cada pedido à IA.
 */
const REQUEST_TIMEOUT_MS = 45_000;

/**
 * Número máximo de questões que podem ser extraídas
 * de uma única página.
 */
const MAX_QUESTIONS_PER_PAGE = 30;

/**
 * ============================================================
 * SCHEMA FINAL DAS QUESTÕES
 * ============================================================
 */

const imageRegionSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0).max(1),
    height: z.number().min(0).max(1),
  })
  .nullable()
  .default(null);

const extractedQuestionSchema = z.object({
  question_text: z.string().min(5),

  option_a: z.string().min(1),

  option_b: z.string().min(1),

  option_c: z.string().min(1),

  option_d: z.string().min(1),

  correct_answer: z.enum([
    "A",
    "B",
    "C",
    "D",
  ]),

  explanation: z
    .string()
    .default(""),

  tip: z
    .string()
    .nullable()
    .default(null),

  difficulty: z
    .enum([
      "facil",
      "medio",
      "dificil",
    ])
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

  /**
   * Região da imagem associada à questão.
   *
   * Todos os valores são relativos à página:
   * 0 = início
   * 1 = fim
   */
  image_region:
    imageRegionSchema,

  /**
   * URL preenchida posteriormente pelo frontend
   * depois do recorte e upload da imagem.
   */
  image_url: z
    .string()
    .url()
    .nullable()
    .default(null),
});

export type ExtractedQuestion =
  z.infer<
    typeof extractedQuestionSchema
  >;

/**
 * ============================================================
 * STRUCTURED OUTPUT DA IA
 * ============================================================
 *
 * Este schema é enviado ao Gemini para obrigar a IA
 * a devolver uma estrutura previsível.
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

      enum: [
        "A",
        "B",
        "C",
        "D",
      ],

      description:
        "Resposta correta identificada através da evidência existente na página.",
    },

    explanation: {
      type: "string",

      description:
        "Explicação curta e fiel ao conteúdo apresentado.",
    },

    tip: {
      type: [
        "string",
        "null",
      ],

      description:
        "Dica curta opcional.",
    },

    difficulty: {
      type: "string",

      enum: [
        "facil",
        "medio",
        "dificil",
      ],
    },

    category_slug: {
      type: [
        "string",
        "null",
      ],
    },

    confidence: {
      type: "number",

      minimum: 0,

      maximum: 1,
    },

    image_region: {
      type: [
        "object",
        "null",
      ],

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
        "Todas as questões identificadas na página, em ordem de leitura.",
    },
  },

  required: [
    "questions",
  ],
};

/**
 * ============================================================
 * PROMPT PRINCIPAL
 * ============================================================
 */

const SYSTEM = `
És um especialista em OCR, visão computacional e
extração de questões de exames teóricos da carta
de condução de Moçambique.

A tua tarefa é TRANSCRIBIR e ESTRUTURAR APENAS
o conteúdo realmente visível na página fornecida.

============================================================
REGRAS ABSOLUTAS
============================================================

1. NÃO INVENTES QUESTÕES.

2. NÃO INVENTES ALTERNATIVAS.

3. NÃO INVENTES RESPOSTAS.

4. NÃO COMPLETES texto que não esteja visível.

5. Se alguma parte estiver ilegível, preserva
   apenas o que conseguires identificar e reduz
   a confidence.

6. Se uma alternativa não estiver visível,
   escreve exatamente:

   [Alternativa não apresentada]

7. A resposta correta só deve ser considerada
   confiável quando existir evidência suficiente
   na própria página.

8. Analisa cuidadosamente marcações visuais
   de respostas, incluindo:

   - cor verde;
   - negrito;
   - sublinhado;
   - X;
   - círculo;
   - marcação;
   - seta;
   - indicação textual;
   - outra marca evidente.

9. Se a resposta correta não puder ser determinada
   com segurança:

   - ainda devolve A/B/C/D;
   - NÃO inventes certeza;
   - confidence deve ser inferior a 0.60;
   - needs_review deve ser true.

10. Nunca utilizes conhecimento externo para transformar
    uma resposta incerta em uma resposta aparentemente certa.

============================================================
OCR
============================================================

11. Utiliza Português de Moçambique.

12. Preserva exatamente:

    - acentos;
    - números;
    - unidades;
    - percentagens;
    - sinais;
    - pontuação;
    - referências legais;
    - velocidades;
    - distâncias;
    - abreviaturas.

13. Atenção especial aos erros:

    0 ↔ O
    1 ↔ I ↔ l
    5 ↔ S
    8 ↔ B
    2 ↔ Z
    6 ↔ G

14. NÃO corrijas automaticamente números.

15. Não alteres uma palavra apenas porque
    parece linguisticamente incorreta.

============================================================
 IMAGENS E FIGURAS
============================================================

16. Procura imagens diretamente associadas
    a cada questão.

Podem ser:

    - sinais de trânsito;
    - placas;
    - semáforos;
    - veículos;
    - fotografias;
    - desenhos;
    - diagramas;
    - esquemas;
    - figuras;
    - ilustrações.

17. Quando existir uma imagem associada
    à questão, devolve image_region.

18. image_region deve indicar SOMENTE a região
    visual da imagem/figura.

NÃO incluas:

    - a pergunta inteira;
    - alternativas;
    - texto desnecessário;
    - outras questões.

19. As coordenadas são relativas à página inteira.

Exemplo:

{
  "x": 0.10,
  "y": 0.25,
  "width": 0.30,
  "height": 0.20
}

Onde:

x      = posição horizontal inicial
y      = posição vertical inicial
width  = largura da imagem
height = altura da imagem

Todos os valores devem estar entre 0 e 1.

20. Se não existir imagem associada:

image_region = null

21. Se houver várias imagens pertencentes
    à mesma questão, tenta incluir todas numa
    única região quando estiverem próximas.

22. Se a imagem estiver entre duas questões,
    analisa:

    - proximidade;
    - alinhamento;
    - numeração;
    - texto da questão;
    - referências à figura;
    - layout.

Não associes uma imagem apenas por proximidade
quando houver evidência de que pertence a outra questão.

23. Se não conseguires determinar com segurança
    a associação da imagem:

    image_region = null
    needs_review = true
    confidence < 0.75

============================================================
 ORGANIZAÇÃO
============================================================

24. Lê a página de cima para baixo.

25. Mantém a ordem original das questões.

26. Não dupliques questões.

27. Se uma questão continuar na página seguinte,
    NÃO inventes a continuação.

28. Se a página não tiver questões:

{
  "questions": []
}

============================================================
 EXPLICAÇÃO
============================================================

29. A explicação deve ser curta.

30. Não inventes legislação.

31. Não acrescentes informações que não estejam
    suficientemente suportadas pelo conteúdo.

============================================================
 CATEGORIAS
============================================================

32. category_slug deve ser SOMENTE um slug
    fornecido pelo sistema.

33. Se não for possível determinar a categoria:

category_slug = null

============================================================
 DIFICULDADE
============================================================

34. facil:

    Questão direta e simples.

35. medio:

    Requer interpretação.

36. dificil:

    Requer interpretação de vários elementos.

============================================================
 CONFIANÇA
============================================================

37. confidence:

    0.90 - 1.00
    leitura muito clara

    0.75 - 0.89
    pequena incerteza

    0.60 - 0.74
    necessita revisão

    0.00 - 0.59
    baixa confiança

38. Qualquer dúvida relevante deve resultar em:

needs_review = true

============================================================
 SAÍDA
============================================================

39. Devolve SOMENTE a estrutura JSON solicitada.

40. Não devolvas Markdown.

41. Não devolvas comentários.

42. Não devolvas texto antes ou depois do JSON.
`;

/**
 * ============================================================
 * ADMIN
 * ============================================================
 */

async function assertAdmin(
  supabase: {
    rpc: (
      fn: string,
      args: Record<
        string,
        unknown
      >,
    ) => PromiseLike<{
      data: unknown;
      error?: unknown;
    }>;
  },
  userId: string,
) {
  const {
    data,
  } = await supabase.rpc(
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
 * ============================================================
 * FETCH COM TIMEOUT
 * ============================================================
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
      () =>
        controller.abort(),
      timeoutMs,
    );

  try {
    return await fetch(
      url,
      {
        ...options,
        signal:
          controller.signal,
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.name ===
        "AbortError"
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
 * ============================================================
 * CLAMP
 * ============================================================
 */

function clamp(
  value: number,
  min = 0,
  max = 1,
) {
  return Math.max(
    min,
    Math.min(max, value),
  );
}

/**
 * ============================================================
 * NORMALIZA IMAGE REGION
 * ============================================================
 */

function normalizeImageRegion(
  value: unknown,
) {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  const region =
    value as Record<
      string,
      unknown
    >;

  const x =
    typeof region.x ===
    "number"
      ? region.x
      : null;

  const y =
    typeof region.y ===
    "number"
      ? region.y
      : null;

  const width =
    typeof region.width ===
    "number"
      ? region.width
      : null;

  const height =
    typeof region.height ===
    "number"
      ? region.height
      : null;

  if (
    x === null ||
    y === null ||
    width === null ||
    height === null
  ) {
    return null;
  }

  const safeX =
    clamp(x);

  const safeY =
    clamp(y);

  const safeWidth =
    clamp(
      width,
      0,
      1 - safeX,
    );

  const safeHeight =
    clamp(
      height,
      0,
      1 - safeY,
    );

  /**
   * Regiões demasiado pequenas normalmente
   * são erros de deteção.
   */
  if (
    safeWidth < 0.01 ||
    safeHeight < 0.01
  ) {
    return null;
  }

  /**
   * Se a IA devolveu praticamente a página inteira,
   * provavelmente confundiu a página com a imagem.
   */
  if (
    safeWidth > 0.95 &&
    safeHeight > 0.95
  ) {
    return null;
  }

  return {
    x: safeX,
    y: safeY,
    width: safeWidth,
    height: safeHeight,
  };
}

/**
 * ============================================================
 * NORMALIZA QUESTÃO
 * ============================================================
 */

function normalizeQuestion(
  item: unknown,
): ExtractedQuestion | null {
  if (
    !item ||
    typeof item !==
      "object"
  ) {
    return null;
  }

  const candidate =
    item as Record<
      string,
      unknown
    >;

  const placeholder =
    "[Alternativa não apresentada]";

  const optionA =
    typeof candidate.option_a ===
      "string" &&
    candidate.option_a.trim()
      ? candidate.option_a.trim()
      : placeholder;

  const optionB =
    typeof candidate.option_b ===
      "string" &&
    candidate.option_b.trim()
      ? candidate.option_b.trim()
      : placeholder;

  const optionC =
    typeof candidate.option_c ===
      "string" &&
    candidate.option_c.trim()
      ? candidate.option_c.trim()
      : placeholder;

  const optionD =
    typeof candidate.option_d ===
      "string" &&
    candidate.option_d.trim()
      ? candidate.option_d.trim()
      : placeholder;

  const missingOption =
    [
      optionA,
      optionB,
      optionC,
      optionD,
    ].some(
      (option) =>
        option ===
        placeholder,
    );

  let confidence =
    typeof candidate.confidence ===
    "number"
      ? candidate.confidence
      : 0.5;

  confidence =
    clamp(confidence);

  /**
   * Alternativa ausente reduz bastante
   * a confiança.
   */
  if (missingOption) {
    confidence =
      Math.min(
        confidence,
        0.59,
      );
  }

  /**
   * needs_review verdadeiro impede
   * confiança artificialmente alta.
   */
  if (
    candidate.needs_review ===
    true
  ) {
    confidence =
      Math.min(
        confidence,
        0.74,
      );
  }

  const imageRegion =
    normalizeImageRegion(
      candidate.image_region,
    );

  const normalized = {
    question_text:
      typeof candidate.question_text ===
      "string"
        ? candidate.question_text.trim()
        : "",

    option_a:
      optionA,

    option_b:
      optionB,

    option_c:
      optionC,

    option_d:
      optionD,

    correct_answer:
      candidate.correct_answer,

    explanation:
      typeof candidate.explanation ===
      "string"
        ? candidate.explanation.trim()
        : "",

    tip:
      candidate.tip === null ||
      typeof candidate.tip ===
        "string"
        ? candidate.tip
        : null,

    difficulty:
      candidate.difficulty,

    category_slug:
      candidate.category_slug ===
        null ||
      typeof candidate.category_slug ===
        "string"
        ? candidate.category_slug
        : null,

    confidence,

    image_region:
      imageRegion,

    /**
     * A URL nunca deve vir da IA.
     *
     * O frontend adiciona a URL depois
     * de fazer o upload da imagem recortada.
     */
    image_url: null,
  };

  const result =
    extractedQuestionSchema.safeParse(
      normalized,
    );

  if (!result.success) {
    console.warn(
      "Questão rejeitada pelo schema:",
      result.error.flatten(),
    );

    return null;
  }

  return result.data;
}

/**
 * ============================================================
 * DEDUPLICAÇÃO
 * ============================================================
 */

function deduplicateQuestions(
  questions: ExtractedQuestion[],
) {
  const seen =
    new Set<string>();

  return questions.filter(
    (question) => {
      const key =
        question.question_text
          .toLowerCase()
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            "",
          )
          .replace(
            /\s+/g,
            " ",
          )
          .trim();

      if (!key) {
        return false;
      }

      if (
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);

      return true;
    },
  );
}

/**
 * ============================================================
 * EXTRAIR QUESTÕES DA PÁGINA
 * ============================================================
 */

const extractPageInputSchema =
  z.object({
    imageBase64:
      z.string().min(20),

    pageText:
      z.string().optional(),

    page:
      z.number()
        .int()
        .positive(),

    categories:
      z.array(
        z.object({
          slug:
            z.string(),

          name:
            z.string(),
        }),
      ),
  });

export const extractQuestionsFromPage =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])

    .inputValidator(
      (
        input: {
          imageBase64: string;
          pageText?: string;
          page: number;
          categories: {
            slug: string;
            name: string;
          }[];
        },
      ) =>
        extractPageInputSchema.parse(
          input,
        ),
    )

    .handler(
      async ({
        data,
        context,
      }) => {
        /**
         * Apenas admins podem utilizar
         * o OCR de importação.
         */
        await assertAdmin(
          context.supabase as never,
          context.userId,
        );

        /**
         * Chave da API.
         *
         * IMPORTANTE:
         * esta variável deve existir no ambiente
         * do servidor/Vercel.
         */
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

        /**
         * Verifica a imagem.
         */
        if (
          !data.imageBase64.startsWith(
            "data:image/",
          )
        ) {
          throw new Error(
            "Imagem da página inválida.",
          );
        }

        /**
         * Lista de categorias disponíveis.
         */
        const catList =
          data.categories.length >
          0
            ? data.categories
                .map(
                  (
                    category,
                  ) =>
                    `${category.slug} (${category.name})`,
                )
                .join(", ")
            : "sem categorias disponíveis";

        /**
         * Texto nativo do PDF.
         */
        const pageText =
          (
            data.pageText ??
            ""
          ).slice(
            0,
            MAX_PAGE_TEXT,
          );

        /**
         * Prompt específico da página.
         */
        const userPrompt = `
Página ${data.page}.

============================================================
CATEGORIAS PERMITIDAS
============================================================

${catList}

============================================================
TEXTO NATIVO EXTRAÍDO DO PDF
============================================================

"""
${pageText}
"""

============================================================
INSTRUÇÕES DE PROCESSAMENTO
============================================================

1. Usa a imagem da página como fonte visual principal.

2. Usa o texto nativo do PDF como apoio.

3. Se existir conflito entre o texto nativo
   e a imagem, privilegia o que está visualmente
   apresentado na imagem.

4. Lê todas as questões de cima para baixo.

5. Não dupliques questões.

6. Não inventes conteúdo.

7. Analisa cuidadosamente números.

8. Analisa cuidadosamente sinais de trânsito.

9. Analisa cuidadosamente as marcações
   de respostas corretas.

10. Identifica imagens associadas às questões.

11. Para cada imagem associada, devolve
    image_region com coordenadas relativas
    entre 0 e 1.

12. NÃO uses image_region para incluir
    a pergunta inteira.

13. NÃO uses image_region para incluir
    alternativas.

14. Se não houver imagem associada:
    image_region = null.

15. Se houver dúvida:
    reduz confidence e marca needs_review.

16. Se a página não tiver questões:
    devolve questions = [].

Extrai agora todas as questões visíveis.
`;

        /**
         * Conteúdo multimodal.
         */
        const userContent = [
          {
            type: "text",

            text:
              userPrompt,
          },

          {
            type: "image_url",

            image_url: {
              url:
                data.imageBase64,
            },
          },
        ];

        /**
         * Pedido Gemini.
         *
         * NÃO usamos temperature porque versões
         * recentes do Gemini podem rejeitar parâmetros
         * de geração antigos.
         */
        const body = {
          model: MODEL,

          messages: [
            {
              role: "system",

              content:
                SYSTEM,
            },

            {
              role: "user",

              content:
                userContent,
            },
          ],

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

          max_tokens:
            12000,
        };

        let response: Response;

        try {
          response =
            await fetchWithTimeout(
              GATEWAY_URL,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${apiKey}`,
                },

                body:
                  JSON.stringify(
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

        /**
         * ====================================================
         * TRATAMENTO DE ERROS
         * ====================================================
         */

        if (!response.ok) {
          const errorText =
            await response.text();

          if (
            response.status ===
            400
          ) {
            throw new Error(
              `Pedido inválido à IA. Verifica o modelo e o Structured Output. ${errorText.slice(
                0,
                500,
              )}`,
            );
          }

          if (
            response.status ===
            401
          ) {
            throw new Error(
              "Chave GEMINI_API_KEY inválida ou não autorizada.",
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
              "Limite da API Gemini atingido. Aguarda alguns segundos e retoma o processamento.",
            );
          }

          if (
            response.status ===
            402
          ) {
            throw new Error(
              "Créditos da API de IA esgotados.",
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
            `Falha da IA (${response.status}): ${errorText.slice(
              0,
              500,
            )}`,
          );
        }

        /**
         * ====================================================
         * PROCESSAR RESPOSTA
         * ====================================================
         */

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
          payload
            .choices?.[0]
            ?.message
            ?.content ??
          "";

        if (!raw) {
          throw new Error(
            "A IA não devolveu conteúdo.",
          );
        }

        /**
         * Remove possíveis blocos Markdown
         * caso o gateway os devolva apesar
         * do Structured Output.
         */
        const cleanJson =
          raw
            .replace(
              /^```json\s*/i,
              "",
            )
            .replace(
              /^```\s*/i,
              "",
            )
            .replace(
              /\s*```$/i,
              "",
            )
            .trim();

        let parsed: unknown;

        try {
          parsed =
            JSON.parse(
              cleanJson,
            );
        } catch {
          throw new Error(
            "A IA devolveu um JSON inválido. A página será reprocessada.",
          );
        }

        if (
          !parsed ||
          typeof parsed !==
            "object"
        ) {
          throw new Error(
            "Formato de resposta da IA inválido.",
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

        /**
         * Normalização + validação + deduplicação.
         */
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
          page:
            data.page,

          questions,
        };
      },
    );

/**
 * ============================================================
 * SCHEMA PARA GUARDAR QUESTÕES
 * ============================================================
 */

const saveQuestionSchema =
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
          .default(null),
    },
  );

const saveSchema =
  z.object({
    importId:
      z.string().uuid(),

    sourceDocument:
      z.string()
        .min(1),

    questions:
      z.array(
        saveQuestionSchema,
      ),
  });

/**
 * ============================================================
 * GUARDAR QUESTÕES IMPORTADAS
 * ============================================================
 */

export const saveImportedQuestions =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])

    .inputValidator(
      (
        input: unknown,
      ) =>
        saveSchema.parse(
          input,
        ),
    )

    .handler(
      async ({
        data,
        context,
      }) => {
        /**
         * Segurança:
         * apenas administradores podem
         * publicar/importar questões.
         */
        await assertAdmin(
          context.supabase as never,
          context.userId,
        );

        /**
         * Não fazer INSERT vazio.
         */
        if (
          data.questions.length ===
          0
        ) {
          return {
            inserted: 0,

            needsReview: 0,
          };
        }

        /**
         * Preparar linhas para o Supabase.
         */
        const rows =
          data.questions.map(
            (
              question,
            ) => {
              /**
               * Confiança inferior a 75%
               * exige revisão.
               */
              const lowConfidence =
                question.confidence <
                0.75;

              /**
               * Alternativa ausente.
               */
              const hasMissingOption =
                [
                  question.option_a,
                  question.option_b,
                  question.option_c,
                  question.option_d,
                ].some(
                  (
                    option,
                  ) =>
                    option ===
                    "[Alternativa não apresentada]",
                );

              /**
               * Se existe região de imagem,
               * mas não existe URL, também
               * deve ser revista.
               */
              const imageExpectedButMissing =
                Boolean(
                  question.image_region,
                ) &&
                !question.image_url;

              const needsReview =
                lowConfidence ||
                hasMissingOption ||
                imageExpectedButMissing;

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

                /**
                 * Imagem recortada.
                 */
                image_url:
                  question.image_url,

                /**
                 * Região original
                 * dentro da página PDF.
                 */
                image_region:
                  question.image_region,

                /**
                 * Questões com problemas
                 * não ficam automaticamente
                 * publicadas.
                 */
                needs_review:
                  needsReview,

                is_published:
                  !needsReview,

                is_verified:
                  false,
              };
            },
          );

        /**
         * ====================================================
         * INSERT
         * ====================================================
         */

        const {
          error,
        } =
          await context.supabase
            .from(
              "questions",
            )
            .insert(rows);

        if (error) {
          throw new Error(
            `Erro ao guardar questões: ${error.message}`,
          );
        }

        /**
         * ====================================================
         * RESULTADO
         * ====================================================
         */

        const needsReview =
          rows.filter(
            (
              row,
            ) =>
              row.needs_review,
          ).length;

        return {
          inserted:
            rows.length,

          needsReview,
        };
      },
    );
