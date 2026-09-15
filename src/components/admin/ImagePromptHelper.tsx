import { useState } from "react";
import { Wand2 } from "lucide-react";

export function buildRealisticImagePrompt(questionText: string, categoryName?: string | null | undefined) {
  const topic = categoryName ? ` sobre ${categoryName.toLowerCase()}` : "";
  const trimmed = questionText.replace(/\s+/g, " ").trim();
  return `Fotografia realista, estilo foto oficial de exame de carta de condução de Moçambique, sem texto overlays, sem cartoons, sem efeitos de IA. Cenário de condução em estrada moçambicana, veículo ligeiro, condições de trânsito reais. Iluminação natural, detalhes de sinalização e de tráfego locais. Sem placas de texto longo ilegíveis. Questão${topic}: "${trimmed}"`;
}

export function ImagePromptHelper({
  questionText,
  categoryName,
  className,
}: {
  questionText: string;
  categoryName?: string | null;
  className?: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = () => {
    const p = buildRealisticImagePrompt(questionText, categoryName);
    setPrompt(p);
    setCopied(false);
  };

  const openTool = (url: string) => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
    window.open(url, "_blank");
  };

  const tools = [
    { name: "Google Flow", url: "https://labs.google/fx/tools/image-fx" },
    { name: "DALL-E", url: "https://chat.openai.com" },
    { name: "Midjourney", url: "https://www.midjourney.com" },
  ];

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <button
        type="button"
        onClick={generate}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold transition-colors hover:bg-secondary"
      >
        <Wand2 className="h-4 w-4" />
        {prompt ? "Atualizar prompt" : "Gerar prompt para IA"}
      </button>
      {prompt && (
        <>
          <textarea
            readOnly
            value={prompt}
            className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs"
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            {tools.map((tool) => (
              <button
                key={tool.name}
                type="button"
                onClick={() => openTool(tool.url)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold hover:bg-secondary"
              >
                {tool.name}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {copied ? "Prompt copiado e ferramenta aberta." : "Clique em uma ferramenta para copiar o prompt e abri-la."}
          </p>
        </>
      )}
    </div>
  );
}
