import type { QuizQuestion, ExplainResponse } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function parseDocument(file: File): Promise<QuizQuestion[]> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/parse-document`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to parse document');
  }
  const data = await res.json();
  if (!Array.isArray(data.questions)) return [];
  return data.questions.filter(
    (q: unknown) =>
      q &&
      typeof q === 'object' &&
      'question' in q &&
      'options' in q &&
      Array.isArray((q as QuizQuestion).options) &&
      typeof (q as QuizQuestion).correctIndex === 'number'
  );
}

export async function parseDocumentText(text: string): Promise<QuizQuestion[]> {
  const res = await fetch(`${API_BASE}/api/parse-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to parse document');
  }
  const data = await res.json();
  if (!Array.isArray(data.questions)) return [];
  return data.questions.filter(
    (q: unknown) =>
      q &&
      typeof q === 'object' &&
      'question' in q &&
      'options' in q &&
      Array.isArray((q as QuizQuestion).options) &&
      typeof (q as QuizQuestion).correctIndex === 'number'
  );
}

export async function getExplanation(
  question: string,
  options: string[],
  correctIndex: number,
  selectedIndex: number
): Promise<ExplainResponse> {
  const res = await fetch(`${API_BASE}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      options,
      correctIndex,
      selectedIndex,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to get explanation');
  }
  return res.json();
}
