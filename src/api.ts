import type { QuizQuestion, ExplainResponse } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';
/** Use base64 JSON only when frontend points to external API (e.g. Vercel). Same-origin (Render, localhost) uses FormData. */
const USE_BASE64_API = !!API_BASE;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

const AUTH_STORAGE_KEY = 'app_password';

export function getStoredPassword(): string | null {
  return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(AUTH_STORAGE_KEY) : null;
}

export function setStoredPassword(p: string): void {
  sessionStorage?.setItem(AUTH_STORAGE_KEY, p);
}

export function clearStoredPassword(): void {
  sessionStorage?.removeItem(AUTH_STORAGE_KEY);
}

function authHeaders(): Record<string, string> {
  const p = getStoredPassword();
  return p ? { 'X-App-Password': p } : {};
}

export async function checkAuth(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/check`, { headers: authHeaders() });
  if (res.status === 401) {
    clearStoredPassword();
    return false;
  }
  return res.ok;
}

export async function parseDocument(file: File): Promise<QuizQuestion[]> {
  const url = `${API_BASE}/api/parse-document`;
  let res: Response;

  if (USE_BASE64_API) {
    if (file.size > 3 * 1024 * 1024) {
      throw new Error('File too large for online use (max 3 MB). Run locally with npm run dev:all for 50 MB support.');
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    let body: { text?: string; fileBase64?: string; mimeType?: string };
    if (isPdf) {
      const buf = await file.arrayBuffer();
      body = {
        fileBase64: arrayBufferToBase64(buf),
        mimeType: 'application/pdf',
      };
    } else {
      body = { text: await file.text() };
    }
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
  } else {
    const form = new FormData();
    form.append('file', file);
    res = await fetch(url, { method: 'POST', body: form, headers: authHeaders() });
  }
  if (res.status === 401) {
    clearStoredPassword();
    window.dispatchEvent(new CustomEvent('auth-required'));
    throw new Error('Password required');
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
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text }),
  });
  if (res.status === 401) {
    clearStoredPassword();
    window.dispatchEvent(new CustomEvent('auth-required'));
    throw new Error('Password required');
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

export async function getExplanation(
  question: string,
  options: string[],
  correctIndex: number,
  selectedIndex: number,
  locale?: string
): Promise<ExplainResponse> {
  const res = await fetch(`${API_BASE}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      question,
      options,
      correctIndex,
      selectedIndex,
      locale: locale || 'en',
    }),
  });
  if (res.status === 401) {
    clearStoredPassword();
    window.dispatchEvent(new CustomEvent('auth-required'));
    throw new Error('Password required');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to get explanation');
  }
  return res.json();
}
