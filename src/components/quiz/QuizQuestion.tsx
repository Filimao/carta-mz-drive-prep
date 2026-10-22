import { CheckCircle2, XCircle, Star, Lightbulb, Timer, Volume2, VolumeX, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

import { ZoomableImage } from "@/components/quiz/ZoomableImage";
import { canSpeak, haptics, speak, stopSpeaking } from "@/lib/feedback";

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
  allowFavorite?: boolean;
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
  allowFavorite = true,
}: QuizQuestionProps) {
  const correct = current.correct_answer as Letter;
  const isLast = index + 1 >= total;
  const [speaking, setSpeaking] = useState(false);
  const [ttsOk, setTtsOk] = useState(false);
  useEffect(() => setTtsOk(canSpeak()), []);
  useEffect(() => {
    stopSpeaking();
    setSpeaking(false);
  }, [current.id]);
  useEffect(() => () => stopSpeaking(), []);
  const critical = remaining !== null && remaining <= 180;
  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const text = [
      current.question_text,
      ...LETTERS.map((l) => `Opção ${l}: ${getOptionText(current, l)}`),
    ].join(". ");
    setSpeaking(true);
    speak(text, () => setSpeaking(false));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 overflow-x-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm font-bold text-white/50 uppercase tracking-widest">
            Questão <span className="text-primary">{index + 1}</span> de {total}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {remaining !== null && (
            <span className={`inline-flex items-center gap-2 rounded-full liquid-glass !rounded-full px-3 py-2 text-sm font-bold tabular-nums ${critical ? "text-destructive ring-2 ring-destructive/60 animate-pulse" : ""}`}>
              <Timer
                className={`h-4 w-4 ${critical ? "text-destructive" : "text-primary"}`}
              />
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:
              {String(remaining % 60).padStart(2, "0")}
            </span>
          )}
          {ttsOk && (
            <button
              type="button"
              onClick={toggleSpeak}
              aria-label={speaking ? "Parar leitura" : "Ouvir questão"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full liquid-glass !rounded-full transition-transform active:scale-90"
            >
              {speaking ? <VolumeX className="h-5 w-5 text-primary" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}
          {allowFavorite && <button
            type="button"
            aria-label="Favorito"
            onClick={onToggleFavorite}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full liquid-glass !rounded-full transition-transform active:scale-90"
          >
            <Star
              className={`h-5 w-5 ${isFavorite ? "fill-warning text-warning" : "text-white/40"}`}
            />
          </button>}
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
          <ZoomableImage src={current.image_url} alt="Contexto visual da questão" />
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="rounded-full bg-primary/20 border-primary/30 px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
            {DIFFICULTY_LABEL[current.difficulty]}
          </span>
          <span className="rounded-full bg-white/5 border-white/10 px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/40">
            {current.source === "PDF" ? "PDF" : "Prática"}
          </span>
          {current.is_verified && <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" />Verificada</span>}
        </div>

        <h3 className="font-display text-base sm:text-lg leading-snug font-bold text-white mb-5 break-words">
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
                onClick={() => {
                  haptics.select();
                  onSelect(letter);
                }}
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
          <div className="mt-6 sm:mt-10 animate-in slide-in-from-top-4 duration-500">
            <div
              className={`rounded-3xl p-4 sm:p-8 ${selected === correct ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20"}`}
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
                {current.is_verified && current.legal_reference && <p className="flex items-start gap-2 text-sm text-muted-foreground"><BookOpen className="mt-0.5 h-4 w-4 shrink-0" />{current.legal_reference}</p>}

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

        <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/10">
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
