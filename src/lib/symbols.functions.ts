import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-3.8-flash";

const SYSTEM = `És um especialista em sinalização de trânsito de Moçambique.

Devolve SEMPRE um objecto JSON válido com esta forma:
{"symbols":[{"name":"Nome do sinal em português","description":"Descrição curta e clara do que o sinal significa (2-3 frases)","category_slug":"slug da categoria"}]}

Regras:
- Português de Moçambique.
- Gera exactamente 8 sinais de trânsito reais (nomes e descrições correctos).
- Cada sinal deve ter um nome curto (1-3 palavras) e descrição clara.
- Os sinais devem ser os mais comuns e importantes para o exame teórico.
- category_slug deve ser um dos slugs fornecidos, ou null para sinais universais.
- Não inventes sinais que não existam na realidade.
- Devolve apenas o JSON pedido.`;

export interface AIGeneratedSymbol {
  name: string;
  description: string;
  category_slug: string | null;
}

export const generateSymbols = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      category_slug: string | null;
      count: number;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["Gemini_API_Key"];
    if (!apiKey) throw new Error("Assistente de IA não configurado.");

    const catSlug = data.category_slug ?? "";
    const userContent = `Gera ${data.count} sinais de trânsito ${catSlug ? `da categoria "${catSlug}"` : "universais de condução"}.

Cada sinal deve ser:
- Um sinal real de Moçambique (pode ser proibição, obrigação, perigo, informação, prioridade, etc.)
- Nome curto e exacto (1-3 palavras em português)
- Descrição clara de 2-3 frases explicando o significado e quando se aplica

Exemplos de tipos: Stop, Cedência de passagem, Limite de velocidade, Sentido único, Sem entrada, Radar, Rua estreita, Cruzamento com prioridade, etc.

Devolve apenas o JSON.`;

    let response: Response | undefined;
    for (let attempt = 0; attempt < 4; attempt += 1) {
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
      if (response.status !== 429 || attempt === 3) break;
      await new Promise<void>((resolve) => setTimeout(resolve, 5_000 * (attempt + 1)));
    }
    if (!response) throw new Error("Não foi possível contactar a IA.");
    if (!response.ok) throw new Error(`Falha da IA (${response.status})`);

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
      throw new Error("A IA devolveu um formato inesperado.");
    }

    const symbols = (parsed as { symbols?: AIGeneratedSymbol[] }).symbols ?? [];
    return {
      symbols: symbols.map((s) => ({
        name: s.name,
        description: s.description,
        categorySlug: s.category_slug,
      })),
    };
  });

export const generateSymbolImagePrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      symbol_name: string;
      category_name: string | null;
    }) => input,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["Gemini_API_Key"];
    if (!apiKey) throw new Error("Assistente de IA não configurado.");

    const topic = data.category_name ? ` de ${data.category_name.toLowerCase()}` : "";
    const SYSTEM = `És um especialista em prompts para geração de imagens de sinalização de trânsito.

Devolve UM objecto JSON: {"prompt":"prompt detalhado para gerar a imagem do sinal"}.

O prompt deve ser:
- Para uma IA de geração de imagens (DALL-E, Midjourney, Stable Diffusion)
- Descrever exactamente como o sinal deve parecer visualmente
- Estilo fotografia realista, iluminação natural, sem texto overlays
- Fundo simples (branco ou cinza claro) para contraste
- O sinal deve ser centralizado e claramente visível
- Incluir detalhes como cor, forma, bordas, símbolos internos
- Não incluir pessoas, veículos ou cenários complexos
- Formato: fotografia profissional de produto/catálogo`;

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: SYSTEM,
          },
          {
            role: "user",
            content: `Gera um prompt para a imagem do sinal de trânsito "${data.symbol_name}"${data.category_name ? ` (categoria: ${data.category_name})` : ""}. O sinal deve ser realista, claro e identificável como o sinal real de Moçambique.`,
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Falha da IA (${response.status})`);

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content ?? "{}";
    try {
      const json = raw.replace(/^```(?:json)?\s*|```$/gi, "").trim();
      const start = json.indexOf("{");
      const end = json.lastIndexOf("}");
      const parsed = JSON.parse(json.slice(start, end + 1));
      return { prompt: String(parsed.prompt ?? "") };
    } catch {
      throw new Error("A IA devolveu um formato inesperado.");
    }
  });
