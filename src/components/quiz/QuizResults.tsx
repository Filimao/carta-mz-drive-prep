import { Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Timer, RotateCcw, BadgeCheck, ShieldX, Share2 } from "lucide-react";
import { toast } from "sonner";
import { whatsappAptoShareUrl } from "@/lib/sharing";

export interface QuizResultsProps {
  title: string;
  score: number;
  answered: number;
  total: number;
  elapsed: number;
  onRestart: () => void;
  onRetryWrong?: () => void;
  categoriesToReview?: string[];
  showSignup?: boolean;
  maxErrors?: number | undefined;
}

export function QuizResults({
  title,
  score,
  answered,
  total,
  elapsed,
  onRestart,
  onRetryWrong,
  categoriesToReview = [],
  showSignup = false,
  maxErrors,
}: QuizResultsProps) {
  const wrong = answered - score;
  const official = maxErrors !== undefined;
  const apto = official && total === 25 && wrong <= maxErrors && answered === total;
  const whatsappHref =
    typeof window === "undefined" ? "#" : whatsappAptoShareUrl(score, window.location.origin);
  const share = async () => {
    const text = official
      ? `Carta MZ Quiz — Simulação do exame teórico: ${apto ? "APTO" : "NÃO APTO"} (${score}/${total} certas, ${wrong} erros, ${Math.floor(elapsed / 60)}m ${elapsed % 60}s).`
      : `Carta MZ Quiz — ${title}: ${score}/${total} certas.`;
    try {
      if (navigator.share) await navigator.share({ text, url: window.location.origin });
      else {
        await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
        toast.success("Resultado copiado. Cole no WhatsApp para partilhar.");
      }
    } catch {
      /* cancelled */
    }
  };
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const verdict =
    percent >= 90
      ? "Excelente desempenho!"
      : percent >= 75
        ? "Bom trabalho, está perto do objectivo."
        : percent >= 50
          ? "Continue a praticar, já domina uma boa parte."
          : "Reforce os temas base e volte a tentar.";

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="liquid-glass p-6 sm:p-12 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

        <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">
          {title} concluído
        </p>
        <div className="relative inline-block">
          <span className="font-display text-6xl sm:text-8xl font-black text-white drop-shadow-2xl">
            {percent}%
          </span>
          <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full -z-10" />
        </div>
        {official ? (
          <div
            className={`mx-auto mt-6 inline-flex -rotate-2 items-center gap-3 rounded-2xl border-4 px-6 py-3 font-display text-3xl font-black uppercase tracking-widest ${apto ? "border-success text-success" : "border-destructive text-destructive"}`}
          >
            {apto ? <BadgeCheck className="h-8 w-8" /> : <ShieldX className="h-8 w-8" />}
            {apto ? "APTO" : "NÃO APTO"}
          </div>
        ) : null}
        <p className="mt-6 font-display text-xl sm:text-2xl font-bold text-white">
          {official
            ? apto
              ? "Resultado desta simulação: APTO. Continue a praticar."
              : wrong > maxErrors
                ? `Ultrapassou o limite de ${maxErrors} erros permitidos.`
                : "Resultado desta simulação: NÃO APTO. O exame não foi concluído dentro do tempo."
            : verdict}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm font-medium text-white/70">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" /> {score} Certas
          </span>
          <span className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" /> {answered - score} Erradas
          </span>
          <span className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" /> {Math.floor(elapsed / 60)}m {elapsed % 60}s
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="liquid-glass !rounded-2xl p-6 text-center group hover:bg-white/5 transition-colors">
          <p className="text-3xl font-black text-success">{score}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-white/50 mt-1">
            Correctas
          </p>
        </div>
        <div className="liquid-glass !rounded-2xl p-6 text-center group hover:bg-white/5 transition-colors">
          <p className="text-3xl font-black text-destructive">{answered - score}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-white/50 mt-1">Erradas</p>
        </div>
        <div className="liquid-glass !rounded-2xl p-6 text-center group hover:bg-white/5 transition-colors">
          <p className="text-3xl font-black text-white">{total - answered}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-white/50 mt-1">Saltadas</p>
        </div>
      </div>

      {categoriesToReview.length > 0 && (
        <section className="liquid-glass rounded-2xl p-5" aria-labelledby="categories-review">
          <h2 id="categories-review" className="font-display text-lg font-bold">
            Categorias a rever
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {categoriesToReview.map((category) => (
              <li key={category} className="rounded-full border border-border px-3 py-1.5 text-sm">
                {category}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap justify-center gap-4">
        <button type="button" onClick={onRestart} className="liquid-button min-w-[160px]">
          <RotateCcw className="h-5 w-5" /> Refazer Teste
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="liquid-button-outline min-w-[160px]"
        >
          <Share2 className="h-5 w-5" /> Partilhar
        </button>
        {apto && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="liquid-button-outline min-w-[160px]"
          >
            <Share2 className="h-5 w-5" /> Partilhar no WhatsApp
          </a>
        )}
        {onRetryWrong && wrong > 0 && (
          <button
            type="button"
            onClick={onRetryWrong}
            className="liquid-button-outline min-w-[160px]"
          >
            Refazer erros
          </button>
        )}
        <Link to="/erros" className="liquid-button-outline min-w-[160px]">
          Praticar Erros
        </Link>
        {showSignup && (
          <Link to="/auth" className="liquid-button min-w-[160px]">
            Criar conta
          </Link>
        )}
        <Link to="/simulados" className="liquid-button-outline min-w-[160px]">
          Novo simulado
        </Link>
      </div>
    </div>
  );
}
