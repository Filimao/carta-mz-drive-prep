export interface ExamResult { mode: string; total: number; correct: number }

/** Performance index, not a statistically calibrated probability. */
export function readiness(results: ExamResult[]) {
  const exams = results.filter((s) => s.mode === "simulado" && s.total === 25).slice(-10);
  if (!exams.length) return { index: null, exams: 0, passed: 0 };
  const answered = exams.reduce((sum, s) => sum + Math.min(s.total, Math.max(0, s.correct)), 0);
  return {
    index: Math.round(answered / (exams.length * 25) * 100),
    exams: exams.length,
    passed: exams.filter((s) => s.total - s.correct <= 3).length,
  };
}