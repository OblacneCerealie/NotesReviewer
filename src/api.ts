import type { QuizQuestion, ExplainResponse } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';
const IS_VERCEL = !API_BASE && typeof window !== 'undefined' && !/^localhost$|^127\.0\.0\.1$/.test(window.location.hostname);

export async function parseDocument(file: File): Promise<QuizQuestion[]> {
  const url = `${API_BASE}/api/parse-document`;
  let res: Response;

  if (IS_VERCEL) {
    if (file.size > 3 * 1024 * 1024) {
      throw new Error('File too large for online use (max 3 MB). Run locally with npm run dev:all for 50 MB support.');
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    let body: { text?: string; fileBase64?: string; mimeType?: string };
    if (isPdf) {
      const buf = await file.arrayBuffer();
      body = {
        fileBase64: btoa(String.fromCharCode(...new Uint8Array(buf))),
        mimeType: 'application/pdf',
      };
    } else {
      body = { text: await file.text() };
    }
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } else {
    const form = new FormData();
    form.append('file', file);
    res = await fetch(url, { method: 'POST', body: form });
  }
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
