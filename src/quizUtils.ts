import type { QuizQuestion } from './types';

/** 0-based indices of all correct options for this question. */
export function getCorrectIndices(q: QuizQuestion): number[] {
  if (Array.isArray(q.correctIndices) && q.correctIndices.length > 0) {
    return q.correctIndices.filter(
      (i) => Number.isInteger(i) && i >= 0 && i < q.options.length
    );
  }
  if (
    typeof q.correctIndex === 'number' &&
    q.correctIndex >= 0 &&
    q.correctIndex < q.options.length
  ) {
    return [q.correctIndex];
  }
  return [];
}

export function isAnswerCorrect(q: QuizQuestion, selectedIndex: number): boolean {
  return getCorrectIndices(q).includes(selectedIndex);
}

export function hasMultipleCorrect(q: QuizQuestion): boolean {
  return getCorrectIndices(q).length > 1;
}

/** Progress 0–100 based on which question you are on (1-based position). */
export function quizProgressPercent(currentIndex: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(((currentIndex + 1) / total) * 100);
}

export function normalizeQuestion(raw: unknown): QuizQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const q = raw as Record<string, unknown>;
  const question = typeof q.question === 'string' ? q.question.trim() : '';
  const options = Array.isArray(q.options)
    ? q.options.map((o) => String(o).trim()).filter(Boolean)
    : [];
  if (!question || options.length < 2) return null;

  let indices: number[] = [];
  if (Array.isArray(q.correctIndices) && q.correctIndices.length > 0) {
    indices = [...new Set(q.correctIndices.map((i) => Number(i)).filter(
      (i) => Number.isInteger(i) && i >= 0 && i < options.length
    ))].sort((a, b) => a - b);
  } else if (typeof q.correctIndex === 'number') {
    const i = q.correctIndex;
    if (Number.isInteger(i) && i >= 0 && i < options.length) indices = [i];
  }
  if (indices.length === 0) return null;

  const base: QuizQuestion = {
    question,
    options,
    correctIndex: indices[0],
  };
  if (indices.length > 1) base.correctIndices = indices;
  return base;
}

export function normalizeQuestions(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeQuestion).filter((q): q is QuizQuestion => q !== null);
}
