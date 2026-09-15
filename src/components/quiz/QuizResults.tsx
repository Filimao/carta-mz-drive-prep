import { Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Timer, RotateCcw } from "lucide-react";

export interface QuizResultsProps {
  title: string;
  score: number;
  answered: number;
  total: number;
  elapsed: number;
  onRestart: () => void;
}

export function QuizResults({
  title,
  score,
  answered,
  total,
  elapsed,
  onRestart,
}: QuizResultsProps) {
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
      <div className="liquid-glass p-12 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

        <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">
          {title} concluído
        </p>
        <div className="relative inline-block">
          <span className="font-display text-8xl font-black text-white drop-shadow-2xl">
            {percent}%
          </span>
          <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full -z-10" />
        </div>
        <p className="mt-6 font-display text-2xl font-bold text-white">{verdict}</p>
        <div className="mt-6 flex items-center justify-center gap-6 text-sm font-medium text-white/70">
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

      <div className="flex flex-wrap justify-center gap-4">
        <button type="button" onClick={onRestart} className="liquid-button min-w-[160px]">
          <RotateCcw className="h-5 w-5" /> Refazer Teste
        </button>
        <Link to="/erros" className="liquid-button-outline min-w-[160px]">
          Praticar Erros
        </Link>
        <Link to="/" className="liquid-button-outline min-w-[160px]">
          Início
        </Link>
      </div>
    </div>
  );
}
