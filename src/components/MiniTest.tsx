import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, RotateCcw, UserRound, XCircle } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { QuizQuestion } from "@/components/quiz/QuizQuestion";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { countQuestions, fetchQuizQuestions, type Letter } from "@/lib/quiz";
import { trackProductEvent } from "@/lib/product-analytics";

const QUESTION_COUNT = 10;

export function MiniTest() {
  const session = useSession();
  const isGuest = !session.userId;
  const {
    data: questions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["public-mini-test"],
    queryFn: () => fetchQuizQuestions({ count: QUESTION_COUNT }),
    staleTime: 0,
    gcTime: 0,
  });
  const { data: availableQuestionCount } = useQuery({
    queryKey: ["question-count"],
    queryFn: countQuestions,
    staleTime: 60_000,
  });
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [answers, setAnswers] = useState<Record<string, Letter>>({});
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const completionTracked = useRef(false);

  const score = useMemo(
    () =>
      questions.reduce(
        (total, question) => (answers[question.id] === question.correct_answer ? total + 1 : total),
        0,
      ),
    [answers, questions],
  );
  const current = questions[index];

  const restart = () => {
    setAnswers({});
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setFinished(false);
    setStarted(false);
    completionTracked.current = false;
    void refetch();
  };

  const finish = () => {
    setFinished(true);
    if (!completionTracked.current) {
      completionTracked.current = true;
      trackProductEvent("mini_test_complete");
    }
  };

  if (isLoading) {
    return (
      <div className="surface rounded-3xl p-8 text-center" aria-busy="true">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">A preparar questões publicadas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface rounded-3xl p-6 text-center">
        <p className="font-semibold">Não foi possível carregar o mini-teste.</p>
        <p className="mt-2 text-sm text-muted-foreground">Verifique a ligação e tente novamente.</p>
        <Button className="mt-4" onClick={() => void refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (questions.length < QUESTION_COUNT) {
    return (
      <div className="surface rounded-3xl p-6 text-center">
        <p className="font-semibold">O mini-teste ainda não está disponível.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          São necessárias 10 questões publicadas. Consulte os preços ou crie uma conta para conhecer
          a plataforma.
        </p>
        {isGuest && (
          <Link to="/auth" className="hero-button mt-5 inline-flex">
            Criar conta
          </Link>
        )}
      </div>
    );
  }

  if (finished) {
    const answered = Object.keys(answers).length;
    const wrong = answered - score;
    const skipped = QUESTION_COUNT - answered;
    const percent = Math.round((score / QUESTION_COUNT) * 100);
    const recommendation =
      percent >= 80
        ? "Bom desempenho neste mini-teste. Continue a praticar para consolidar os temas."
        : percent >= 50
          ? "Reforce os temas em que teve dificuldade e volte a praticar."
          : "Comece por rever as explicações e pratique por tema ao seu ritmo.";
    return (
      <section
        className="liquid-glass rounded-3xl p-6 text-center sm:p-10"
        aria-labelledby="mini-test-result"
      >
        <h2 id="mini-test-result" className="font-display text-2xl font-bold">
          Resultado do mini-teste
        </h2>
        <p className="mt-5 font-display text-6xl font-black text-primary">{percent}%</p>
        <p className="mt-4 text-base font-semibold">
          {score} acertos · {wrong} erros · {skipped} por responder · {QUESTION_COUNT} questões
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {recommendation}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {isGuest && (
            <Link
              to="/auth"
              onClick={() => trackProductEvent("create_account_click")}
              className="hero-button justify-center"
            >
              <UserRound className="h-4 w-4" aria-hidden="true" /> Criar conta gratuita
            </Link>
          )}
          <Button variant="outline" onClick={restart} className="min-h-11">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Repetir mini-teste
          </Button>
        </div>
        {isGuest && (
          <p className="mt-5 text-xs text-muted-foreground">
            Crie a sua conta gratuita para desbloquear{" "}
            {availableQuestionCount
              ? `todas as ${availableQuestionCount} questões publicadas`
              : "todas as questões publicadas"}
            , simulados cronometrados e modo offline.
          </p>
        )}
      </section>
    );
  }

  if (!started) {
    return (
      <section className="surface rounded-3xl p-6 text-center sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Mini-teste gratuito
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold">Experimente 10 questões publicadas</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Responda às perguntas, veja o feedback e as explicações. As respostas deste teste não são
          guardadas no seu progresso.
        </p>
        <Button
          className="mt-6 min-h-12 px-6"
          onClick={() => {
            trackProductEvent("mini_test_start");
            setStarted(true);
          }}
        >
          Experimentar Mini-Teste Gratuito
        </Button>
      </section>
    );
  }

  if (!current) return null;

  const confirmAnswer = () => {
    if (!selected) return;
    setAnswers((previous) => ({ ...previous, [current.id]: selected }));
    setRevealed(true);
  };

  const next = () => {
    if (index + 1 === questions.length) {
      finish();
      return;
    }
    setIndex((previous) => previous + 1);
    setSelected(null);
    setRevealed(false);
  };

  return (
    <div>
      <QuizQuestion
        question={current}
        index={index}
        total={questions.length}
        title="Mini-teste público"
        remaining={null}
        isFavorite={false}
        selected={selected}
        revealed={revealed}
        examMode={false}
        onSelect={setSelected}
        onConfirm={confirmAnswer}
        onNext={next}
        onGiveUp={finish}
        onToggleFavorite={() => {}}
        allowFavorite={false}
      />
      {revealed && (
        <div
          className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {selected === current.correct_answer ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-primary" /> Resposta correcta
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-destructive" /> Reveja a explicação antes de avançar
            </>
          )}
        </div>
      )}
    </div>
  );
}
