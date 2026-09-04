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
      <div className="space-y-4" aria-busy="true">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface rounded-2xl p-6 text-center">
        <p className="font-semibold">Não foi possível carregar as questões.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="surface rounded-2xl p-8 text-center">
        <p className="font-display text-lg font-semibold">Sem questões para estes filtros</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajuste a categoria, a dificuldade ou responda a mais questões para criar histórico.
        </p>
        <Link
          to="/categorias"
          className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
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
      <div className="space-y-6">
        <div className="surface rounded-3xl p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">{title} concluído</p>
          <p className="mt-2 font-display text-6xl font-bold text-primary">{percent}%</p>
          <p className="mt-2 font-medium">{verdict}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Acertou {score} de {questions.length} questões · {answered} respondidas ·{" "}
            {Math.floor(elapsed / 60)}m {elapsed % 60}s
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="surface rounded-2xl p-4 text-center">
            <p className="text-2xl font-semibold text-success">{score}</p>
            <p className="text-xs text-muted-foreground">Correctas</p>
          </div>
          <div className="surface rounded-2xl p-4 text-center">
            <p className="text-2xl font-semibold text-destructive">{answered - score}</p>
            <p className="text-xs text-muted-foreground">Erradas</p>
          </div>
          <div className="surface rounded-2xl p-4 text-center">
            <p className="text-2xl font-semibold">{questions.length - answered}</p>
            <p className="text-xs text-muted-foreground">Não respondidas</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
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
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <RotateCcw className="h-4 w-4" /> Refazer
          </button>
          <Link
            to="/erros"
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold"
          >
            Praticar erros
          </Link>
          <Link to="/" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const isFavorite = favorites.includes(current.id);
  const correct = current.correct_answer as Letter;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">
            Questão {index + 1} de {questions.length}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {remaining !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 font-medium">
              <Timer className="h-4 w-4" />
              {String(Math.floor(remaining / 60)).padStart(2, "0")}:
              {String(remaining % 60).padStart(2, "0")}
            </span>
          )}
          <button
            type="button"
            onClick={() => setFavorites(toggleFavorite(current.id))}
            aria-label={isFavorite ? "Remover dos favoritos" : "Marcar questão"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border"
          >
            <Star
              className={`h-4 w-4 ${isFavorite ? "fill-warning text-warning" : "text-muted-foreground"}`}
            />
          </button>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={questions.length}>
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${((index + (revealed ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <article className="surface rounded-3xl p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-secondary px-2.5 py-1 font-medium">
            {DIFFICULTY_LABEL[current.difficulty]}
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-muted-foreground">
            {current.source === "PDF"
              ? "Questão proveniente dos materiais fornecidos"
              : "Questão de prática criada pela plataforma"}
          </span>
        </div>

        <h2 className="mt-4 font-display text-xl leading-snug font-semibold">
          {current.question_text}
        </h2>

        {current.image_url && (
          <img
            src={current.image_url}
            alt="Imagem associada à questão"
            className="mt-4 max-h-64 w-full rounded-xl border border-border object-contain bg-white"
          />
        )}

        <ul className="mt-5 space-y-3">
          {LETTERS.map((letter) => {
            const chosen = selected === letter;
            const showCorrect = revealed && letter === correct;
            const showWrong = revealed && chosen && letter !== correct;
            return (
              <li key={letter}>
                <button
                  type="button"
                  disabled={revealed}
                  onClick={() => setSelected(letter)}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all ${
                    showCorrect
                      ? "border-success bg-success/10"
                      : showWrong
                        ? "border-destructive bg-destructive/10"
                        : chosen
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-secondary"
                  }`}
                >
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-xs font-bold">
                    {letter}
                  </span>
                  <span className="text-sm leading-relaxed">{optionText(current, letter)}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {revealed && !examMode && (
          <div className="mt-5 space-y-3 rounded-2xl bg-secondary/60 p-4">
            <p
              className={`inline-flex items-center gap-2 font-semibold ${
                selected === correct ? "text-success" : "text-destructive"
              }`}
            >
              {selected === correct ? (
                <>
                  <CheckCircle2 className="h-5 w-5" /> Resposta correcta!
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5" /> Resposta incorrecta — a correcta é {correct}
                </>
              )}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{current.explanation}</p>
            {current.tip && (
              <p className="inline-flex items-start gap-2 text-sm font-medium">
                <Lightbulb className="mt-0.5 h-4 w-4 text-warning" /> {current.tip}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
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
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {examMode ? "Confirmar e seguir" : "Responder"}
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
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {index + 1 >= questions.length ? "Ver resultado" : "Próxima questão"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setFinished(true)}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold"
          >
            Terminar
          </button>
        </div>
      </article>
    </div>
  );
}
