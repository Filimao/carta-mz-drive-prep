import { CheckCircle2, XCircle, Star, Lightbulb, Timer } from "lucide-react";

import { DIFFICULTY_LABEL, getOptionText, type Letter, type Question } from "@/lib/quiz";

const LETTERS: Letter[] = ["A", "B", "C", "D"];

export interface QuizQuestionProps {
  question: Question;
  index: number;
  total: number;
  title: string;
  remaining: number | null;
  isFavorite: boolean;
  selected: Letter | null;
  revealed: boolean;
  examMode: boolean;
  onSelect: (letter: Letter) => void;
  onConfirm: () => void;
  onNext: () => void;
  onGiveUp: () => void;
  onToggleFavorite: () => void;
}

export function QuizQuestion({
  question: current,
  index,
  total,
  title,
  remaining,
  isFavorite,
  selected,
  revealed,
  examMode,
  onSelect,
  onConfirm,
  onNext,
  onGiveUp,
  onToggleFavorite,
}: QuizQuestionProps) {
  const correct = current.correct_answer as Letter;
  const isLast = index + 1 >= total;

  return (
    <div className="max-w-4xl mx-auto space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm font-bold text-white/50 uppercase tracking-widest">
            Questão <span className="text-primary">{index + 1}</span> de {total}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {remaining !== null && (
            <span className="inline-flex items-center gap-2 rounded-full liquid-glass !rounded-full px-4 py-2 text-sm font-bold">
              <Timer
                className={`h-4 w-4 ${remaining < 60 ? "text-destructive animate-pulse" : "text-primary"}`}
              />
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:
              {String(remaining % 60).padStart(2, "0")}
            </span>
          )}
          <button
            type="button"
            onClick={onToggleFavorite}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full liquid-glass !rounded-full transition-transform active:scale-90"
          >
            <Star
              className={`h-5 w-5 ${isFavorite ? "fill-warning text-warning" : "text-white/40"}`}
            />
          </button>
        </div>
      </div>

      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary shadow-[0_0_15px_oklch(var(--primary)/0.5)] transition-all duration-500 ease-out"
          style={{ width: `${((index + (revealed ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      <article className="liquid-glass p-4 sm:p-6">
        {current.image_url && (
          <a
            href={current.image_url}
            target="_blank"
            rel="noreferrer"
            title="Abrir imagem em tamanho real"
            className="mb-5 block rounded-2xl overflow-hidden border border-border bg-muted ring-1 ring-primary/20 shadow-lg"
          >
            <img
              src={current.image_url}
              alt="Contexto visual da questão"
              loading="eager"
              className="block w-full h-auto min-h-[200px] max-h-[65vh] object-contain"
            />
          </a>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="rounded-full bg-primary/20 border-primary/30 px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
            {DIFFICULTY_LABEL[current.difficulty]}
          </span>
          <span className="rounded-full bg-white/5 border-white/10 px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/40">
            {current.source === "PDF" ? "Oficial" : "Prática"}
          </span>
        </div>

        <h3 className="font-display text-lg leading-snug font-bold text-white mb-5">
          {current.question_text}
        </h3>

        <div className="grid gap-3">
          {LETTERS.map((letter) => {
            const chosen = selected === letter;
            const showCorrect = revealed && letter === correct;
            const showWrong = revealed && chosen && letter !== correct;

            let statusClass = "border-white/10 bg-white/5 text-white/80 hover:bg-white/10";
            if (showCorrect)
              statusClass =
                "border-success bg-success/20 text-white shadow-[0_0_20px_oklch(var(--success)/0.2)]";
            else if (showWrong)
              statusClass =
                "border-destructive bg-destructive/20 text-white shadow-[0_0_20px_oklch(var(--destructive)/0.2)]";
            else if (chosen)
              statusClass =
                "border-primary bg-primary/20 text-white shadow-[0_0_20px_oklch(var(--primary)/0.2)]";

            return (
              <button
                key={letter}
                type="button"
                disabled={revealed}
                onClick={() => onSelect(letter)}
                className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-300 ${statusClass}`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-sm font-black transition-colors ${
                    chosen || showCorrect || showWrong
                      ? "border-transparent bg-white/20"
                      : "border-white/20"
                  }`}
                >
                  {letter}
                </span>
                <span className="text-sm font-medium leading-relaxed">
                  {getOptionText(current, letter)}
                </span>
              </button>
            );
          })}
        </div>

        {revealed && !examMode && (
          <div className="mt-10 animate-in slide-in-from-top-4 duration-500">
            <div
              className={`rounded-3xl p-8 ${selected === correct ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20"}`}
            >
              <div className="flex items-center gap-3 mb-4">
                {selected === correct ? (
                  <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-destructive" />
                  </div>
                )}
                <div>
                  <p className="font-display text-xl font-bold">
                    {selected === correct ? "Resposta Correcta!" : "Resposta Incorrecta"}
                  </p>
                  {selected !== correct && (
                    <p className="text-sm font-medium opacity-70">
                      A opção correcta era a{" "}
                      <span className="font-bold text-success">{correct}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-base leading-relaxed text-white/80 border-l-2 border-white/20 pl-4 py-1 italic">
                  {current.explanation}
                </p>

                {current.tip && (
                  <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
                    <Lightbulb className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-warning mb-1">
                        Dica de Especialista
                      </p>
                      <p className="text-sm font-medium text-white/90">{current.tip}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 flex-wrap gap-4 pt-6 border-t border-white/10">
          {!revealed ? (
            <button
              type="button"
              disabled={!selected}
              onClick={onConfirm}
              className="liquid-button w-full sm:flex-1 min-w-0"
            >
              {examMode ? "Confirmar e Próxima" : "Verificar Resposta"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="liquid-button w-full sm:flex-1 min-w-0"
            >
              {isLast ? "Ver Resultados Finais" : "Seguinte Questão"}
            </button>
          )}
          <button
            type="button"
            onClick={onGiveUp}
            className="liquid-button-outline w-full sm:w-auto"
          >
            Desistir
          </button>
        </div>
      </article>
    </div>
  );
}
