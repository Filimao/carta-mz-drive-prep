import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { XCircle, Lightbulb } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { QuizResults } from "@/components/quiz/QuizResults";
import { QuizQuestion } from "@/components/quiz/QuizQuestion";
import { haptics } from "@/lib/feedback";
import { useSession } from "@/hooks/useSession";
import {
  fetchStudyCategories,
  fetchQuizQuestions,
  persistSession,
  recordAnswer,
  recordSession,
  readLocal,
  toggleFavorite,
  type Letter,
  type QuizConfig,
} from "@/lib/quiz";

export interface QuizEngineProps {
  config: QuizConfig;
  mode: "pratica" | "simulado" | "tempo" | "erros" | "favoritos" | "aleatorio";
  title: string;
  timeLimitSeconds?: number;
  /** Official exam rule: more than this many wrong answers ends the exam as "Não Apto". */
  maxErrors?: number;
}

export function QuizEngine({ config, mode, title, timeLimitSeconds, maxErrors }: QuizEngineProps) {
  const examMode = mode === "simulado";
  const session = useSession();
  const [activeConfig, setActiveConfig] = useState(config);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["quiz", mode, activeConfig],
    queryFn: () => fetchQuizQuestions(activeConfig),
    staleTime: 0,
    gcTime: 0,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["study-categories"],
    queryFn: fetchStudyCategories,
    staleTime: 60_000,
  });

  const questions = useMemo(() => data ?? [], [data]);
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
    if (navigator.onLine) recordSession(mode, questions.length, score, elapsed);
    void persistSession({
      mode,
      total: questions.length,
      correct: score,
      wrong: answered - score,
      skipped: questions.length - answered,
      seconds: elapsed,
    }).catch((error: unknown) => {
      console.error("[quiz] Não foi possível guardar o resultado para sincronização:", error);
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
        <p className="mt-2 text-muted-foreground">
          Não foi possível carregar as questões. Verifique a sua ligação.
        </p>
        <button type="button" onClick={() => void refetch()} className="liquid-button mt-6">
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
        <Link to="/categorias" className="liquid-button mt-6">
          Ver categorias
        </Link>
      </div>
    );
  }

  const finishedAnswers = Object.keys(answers).length;
  const restart = () => {
    setAnswers({});
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setElapsed(0);
    setFinished(false);
    void refetch();
  };
  const retryWrong = () => {
    const wrongQuestions = questions.filter(
      (question) =>
        answers[question.id] !== undefined && answers[question.id] !== question.correct_answer,
    );
    if (wrongQuestions.length === 0) return;
    setActiveConfig({
      ...config,
      count: wrongQuestions.length,
      ids: wrongQuestions.map((question) => question.id),
    });
    setAnswers({});
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setElapsed(0);
    setFinished(false);
  };

  if (finished) {
    const wrongCategoryIds = new Set(
      questions
        .filter(
          (question) =>
            answers[question.id] !== undefined && answers[question.id] !== question.correct_answer,
        )
        .map((question) => question.category_id)
        .filter((categoryId): categoryId is string => categoryId !== null),
    );
    const categoriesToReview = categories
      .filter((category) => wrongCategoryIds.has(category.id))
      .map((category) => category.name);
    return (
      <QuizResults
        title={title}
        score={score}
        answered={finishedAnswers}
        total={questions.length}
        elapsed={elapsed}
        onRestart={restart}
        onRetryWrong={retryWrong}
        categoriesToReview={categoriesToReview}
        showSignup={!session.loading && !session.userId}
        maxErrors={maxErrors}
      />
    );
  }

  if (!current) return null;

  const confirmAnswer = () => {
    if (!selected) return;
    const isCorrect = selected === (current.correct_answer as Letter);
    const nextAnswers = { ...answers, [current.id]: selected };
    setAnswers(nextAnswers);
    if (navigator.onLine) recordAnswer(current.id, isCorrect);
    if (isCorrect) haptics.correct();
    else haptics.wrong();
    if (maxErrors !== undefined) {
      const wrong = questions.filter(
        (q) => nextAnswers[q.id] && nextAnswers[q.id] !== q.correct_answer,
      ).length;
      if (wrong > maxErrors) {
        setFinished(true);
        return;
      }
    }
    if (examMode) {
      if (index + 1 >= questions.length) setFinished(true);
      else {
        setIndex(index + 1);
        setSelected(null);
      }
    } else {
      setRevealed(true);
    }
  };

  const goNext = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setRevealed(false);
  };

  return (
    <QuizQuestion
      question={current}
      index={index}
      total={questions.length}
      title={title}
      remaining={remaining}
      isFavorite={favorites.includes(current.id)}
      selected={selected}
      revealed={revealed}
      examMode={examMode}
      onSelect={setSelected}
      onConfirm={confirmAnswer}
      onNext={goNext}
      onGiveUp={() => setFinished(true)}
      onToggleFavorite={() => setFavorites(toggleFavorite(current.id))}
    />
  );
}
