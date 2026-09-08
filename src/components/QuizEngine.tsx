import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Star, Lightbulb, Timer, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  DIFFICULTY_LABEL,
  fetchQuizQuestions,
  persistSession,
  recordAnswer,
  recordSession,
  readLocal,
  toggleFavorite,
  type Letter,
  type Question,
  type QuizConfig,
} from "@/lib/quiz";

const LETTERS: Letter[] = ["A", "B", "C", "D"];

function optionText(q: Question, letter: Letter) {
  return letter === "A"
    ? q.option_a
    : letter === "B"
      ? q.option_b
      : letter === "C"
        ? q.option_c
        : q.option_d;
}

export interface QuizEngineProps {
  config: QuizConfig;
  mode: "pratica" | "simulado" | "tempo" | "erros" | "favoritos" | "aleatorio";
  title: string;
  timeLimitSeconds?: number;
}

export function QuizEngine({ config, mode, title, timeLimitSeconds }: QuizEngineProps) {
  const examMode = mode === "simulado";
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["quiz", mode, config],
    queryFn: () => fetchQuizQuestions(config),
    staleTime: 0,
    gcTime: 0,
  });

  const questions = data ?? [];
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [answers, setAnswers] = useState<Record<string, Letter>>({});
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => setFavorites(readLocal().favorites), []);

  useEffect(() => {
    if (finished) return;
    const id = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [finished]);

  const remaining = timeLimitSeconds ? Math.max(0, timeLimitSeconds - elapsed) : null;
  const current = questions[index];

  const score = useMemo(
    () =>
      questions.reduce(
        (acc, q) => (answers[q.id] && answers[q.id] === q.correct_answer ? acc + 1 : acc),
        0,
      ),
    [answers, questions],
  );

  useEffect(() => {
    if (remaining === 0 && !finished && questions.length > 0) setFinished(true);
  }, [remaining, finished, questions.length]);

  useEffect(() => {
    if (!finished || questions.length === 0) return;
    const answered = Object.keys(answers).length;
    recordSession(mode, questions.length, score, elapsed);
    void persistSession({
      mode,
      total: questions.length,
      correct: score,
      wrong: answered - score,
      skipped: questions.length - answered,
      seconds: elapsed,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

    if (isLoading) {
    return (
      <div className="space-y-6 py-12 text-center" aria-busy="true">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="font-display text-xl font-bold animate-pulse">Carregando questões...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="liquid-glass rounded-3xl p-12 text-center max-w-lg mx-auto">
        <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <p className="font-display text-xl font-bold">Oops! Algo correu mal.</p>
        <p className="mt-2 text-muted-foreground">Não foi possível carregar as questões. Verifique a sua ligação.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="liquid-button mt-6"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="liquid-glass rounded-3xl p-12 text-center max-w-lg mx-auto">
        <Lightbulb className="mx-auto h-12 w-12 text-primary mb-4" />
        <p className="font-display text-xl font-bold">Sem questões encontradas</p>
        <p className="mt-2 text-muted-foreground">
          Ajuste os filtros ou responda a mais questões para ver histórico aqui.
        </p>
        <Link
          to="/categorias"
          className="liquid-button mt-6"
        >
          Ver categorias
        </Link>
      </div>
    );
  }

  if (finished) {
    const answered = Object.keys(answers).length;
    const percent = Math.round((score / questions.length) * 100);
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
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          
          <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">{title} concluído</p>
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
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mt-1">Correctas</p>
          </div>
          <div className="liquid-glass !rounded-2xl p-6 text-center group hover:bg-white/5 transition-colors">
            <p className="text-3xl font-black text-destructive">{answered - score}</p>
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mt-1">Erradas</p>
          </div>
          <div className="liquid-glass !rounded-2xl p-6 text-center group hover:bg-white/5 transition-colors">
            <p className="text-3xl font-black text-white">{questions.length - answered}</p>
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mt-1">Saltadas</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setIndex(0);
              setSelected(null);
              setRevealed(false);
              setElapsed(0);
              setFinished(false);
              void refetch();
            }}
            className="liquid-button min-w-[160px]"
          >
            <RotateCcw className="h-5 w-5" /> Refazer Teste
          </button>
          <Link
            to="/erros"
            className="liquid-button-outline min-w-[160px]"
          >
            Praticar Erros
          </Link>
          <Link to="/" className="liquid-button-outline min-w-[160px]">
            Início
          </Link>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const isFavorite = favorites.includes(current.id);
  const correct = current.correct_answer as Letter;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm font-bold text-white/50 uppercase tracking-widest">
            Questão <span className="text-primary">{index + 1}</span> de {questions.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {remaining !== null && (
            <span className="inline-flex items-center gap-2 rounded-full liquid-glass !rounded-full px-4 py-2 text-sm font-bold">
              <Timer className={`h-4 w-4 ${remaining < 60 ? 'text-destructive animate-pulse' : 'text-primary'}`} />
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:
              {String(remaining % 60).padStart(2, "0")}
            </span>
          )}
          <button
            type="button"
            onClick={() => setFavorites(toggleFavorite(current.id))}
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
          style={{ width: `${((index + (revealed ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <article className="liquid-glass p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="rounded-full bg-primary/20 border border-primary/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            {DIFFICULTY_LABEL[current.difficulty]}
          </span>
          <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
            {current.source === "PDF" ? "Oficial" : "Prática"}
          </span>
        </div>

        <h3 className="font-display text-2xl leading-tight font-bold text-white mb-8">
          {current.question_text}
        </h3>

        {current.image_url && (
          <div className="mb-8 rounded-2xl overflow-hidden border border-white/10 bg-black/20 group">
            <img
              src={current.image_url}
              alt="Contexto visual da questão"
              className="max-h-[400px] w-full object-contain p-2 group-hover:scale-[1.02] transition-transform duration-500"
            />
          </div>
        )}

        <div className="grid gap-4">
          {LETTERS.map((letter) => {
            const chosen = selected === letter;
            const showCorrect = revealed && letter === correct;
            const showWrong = revealed && chosen && letter !== correct;
            
            let statusClass = "border-white/10 bg-white/5 text-white/80 hover:bg-white/10";
            if (showCorrect) statusClass = "border-success bg-success/20 text-white shadow-[0_0_20px_oklch(var(--success)/0.2)]";
            else if (showWrong) statusClass = "border-destructive bg-destructive/20 text-white shadow-[0_0_20px_oklch(var(--destructive)/0.2)]";
            else if (chosen) statusClass = "border-primary bg-primary/20 text-white shadow-[0_0_20px_oklch(var(--primary)/0.2)]";

            return (
              <button
                key={letter}
                type="button"
                disabled={revealed}
                onClick={() => setSelected(letter)}
                className={`group flex w-full items-center gap-5 rounded-2xl border p-5 text-left transition-all duration-300 ${statusClass}`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-lg font-black transition-colors ${
                  chosen || showCorrect || showWrong ? 'border-transparent bg-white/20' : 'border-white/20'
                }`}>
                  {letter}
                </span>
                <span className="text-base font-medium leading-relaxed">{optionText(current, letter)}</span>
              </button>
            );
          })}
        </div>

        {revealed && !examMode && (
          <div className="mt-10 animate-in slide-in-from-top-4 duration-500">
            <div className={`rounded-3xl p-8 ${selected === correct ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
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
                    <p className="text-sm font-medium opacity-70">A opção correcta era a <span className="font-bold text-success">{correct}</span></p>
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
                      <p className="text-xs font-bold uppercase tracking-wider text-warning mb-1">Dica de Especialista</p>
                      <p className="text-sm font-medium text-white/90">{current.tip}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-4 pt-6 border-t border-white/10">
          {!revealed ? (
            <button
              type="button"
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                setAnswers((prev) => ({ ...prev, [current.id]: selected }));
                recordAnswer(current.id, selected === correct);
                if (examMode) {
                  if (index + 1 >= questions.length) setFinished(true);
                  else {
                    setIndex(index + 1);
                    setSelected(null);
                  }
                } else {
                  setRevealed(true);
                }
              }}
              className="liquid-button flex-1 min-w-[200px]"
            >
              {examMode ? "Confirmar e Próxima" : "Verificar Resposta"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (index + 1 >= questions.length) {
                  setFinished(true);
                  return;
                }
                setIndex(index + 1);
                setSelected(null);
                setRevealed(false);
              }}
              className="liquid-button flex-1 min-w-[200px]"
            >
              {index + 1 >= questions.length ? "Ver Resultados Finais" : "Seguinte Questão"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setFinished(true)}
            className="liquid-button-outline px-8"
          >
            Desistir
          </button>
        </div>
      </article>
    </div>
  );
}

