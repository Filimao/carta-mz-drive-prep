import { describe, expect, it, vi } from "vitest";

// quiz.ts imports the Supabase client at module scope; stub it so the pure
// functions under test can be imported without a browser/env setup.
vi.mock("../integrations/supabase/client", () => ({ supabase: {} }));

import { levelFor, shuffleOptions, type Question } from "./quiz";

function makeQuestion(correct: Question["correct_answer"]): Question {
  return {
    id: "q1",
    question_text: "Qual a velocidade máxima?",
    option_a: "40 km/h",
    option_b: "60 km/h",
    option_c: "80 km/h",
    option_d: "100 km/h",
    correct_answer: correct,
    explanation: "",
    tip: null,
    difficulty: "facil",
    source: "PDF",
    source_document: null,
    category_id: null,
    image_url: null,
  };
}

describe("levelFor", () => {
  it("starts at Iniciante with 0 xp", () => {
    expect(levelFor(0)).toEqual({ name: "Iniciante", next: "Aprendiz", progress: 0 });
  });

  it("is exactly on a threshold when xp equals the level requirement", () => {
    expect(levelFor(200).name).toBe("Aprendiz");
    expect(levelFor(600).name).toBe("Condutor");
    expect(levelFor(1400).name).toBe("Condutor Avançado");
    expect(levelFor(3000).name).toBe("Especialista");
  });

  it("reports 0% progress right at a threshold", () => {
    expect(levelFor(200).progress).toBe(0);
  });

  it("reports ~50% progress halfway to the next level", () => {
    // Iniciante: 0 -> 200, halfway = 100 xp
    expect(levelFor(100).progress).toBe(50);
  });

  it("caps at Mestre da Estrada with 100% progress beyond max xp", () => {
    const lvl = levelFor(10000);
    expect(lvl.name).toBe("Mestre da Estrada");
    expect(lvl.next).toBeNull();
    expect(lvl.progress).toBe(100);
  });
});

describe("shuffleOptions", () => {
  it("always marks exactly one option as correct", () => {
    for (const answer of ["A", "B", "C", "D"] as const) {
      const q = shuffleOptions(makeQuestion(answer));
      const texts = [q.option_a, q.option_b, q.option_c, q.option_d];
      const correctText = { A: "40 km/h", B: "60 km/h", C: "80 km/h", D: "100 km/h" }[answer];
      expect(texts.filter((t) => t === correctText)).toHaveLength(1);
    }
  });

  it("keeps the same set of option texts after shuffling", () => {
    const q = shuffleOptions(makeQuestion("C"));
    const before = ["40 km/h", "60 km/h", "80 km/h", "100 km/h"].sort();
    const after = [q.option_a, q.option_b, q.option_c, q.option_d].sort();
    expect(after).toEqual(before);
  });

  it("points correct_answer at the option that holds the original correct text", () => {
    for (const answer of ["A", "B", "C", "D"] as const) {
      const q = shuffleOptions(makeQuestion(answer));
      const optionFor = {
        A: q.option_a,
        B: q.option_b,
        C: q.option_c,
        D: q.option_d,
      }[q.correct_answer];
      const correctText = { A: "40 km/h", B: "60 km/h", C: "80 km/h", D: "100 km/h" }[answer];
      expect(optionFor).toBe(correctText);
    }
  });

  it("does not mutate the input question", () => {
    const q = makeQuestion("D");
    const copy = { ...q };
    shuffleOptions(q);
    expect(q).toEqual(copy);
  });
});
