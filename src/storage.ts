import type { QuizSession, StoredProgress, MyNote } from './types';

const KEY = 'notes-reviewer-progress';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): StoredProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return getDefault();
    const parsed = JSON.parse(raw) as StoredProgress;
    return {
      session: parsed.session ?? null,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      savedQuizzes: Array.isArray(parsed.savedQuizzes) ? parsed.savedQuizzes : [],
      myNotes: Array.isArray(parsed.myNotes) ? parsed.myNotes : [],
      streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
      lastVisitDate: typeof parsed.lastVisitDate === 'string' ? parsed.lastVisitDate : '',
    };
  } catch {
    return getDefault();
  }
}

function getDefault(): StoredProgress {
  return {
    session: null,
    history: [],
    savedQuizzes: [],
    myNotes: [],
    streak: 0,
    lastVisitDate: '',
  };
}

export function getProgress(): StoredProgress {
  const progress = load();
  const todayStr = today();
  if (progress.lastVisitDate === todayStr) return progress;
  // Update streak: if last visit was yesterday, increment; else reset
  if (progress.lastVisitDate) {
    const last = new Date(progress.lastVisitDate);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (last.toDateString() === yesterday.toDateString()) {
      progress.streak = (progress.streak || 0) + 1;
    } else if (last.toDateString() !== todayStr) {
      progress.streak = 0;
    }
  }
  progress.lastVisitDate = todayStr;
  save(progress);
  return progress;
}

export function save(progress: StoredProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function saveSession(session: QuizSession | null): void {
  const progress = getProgress();
  if (session && session.currentIndex >= session.questions.length) {
    progress.history = [session, ...progress.history].slice(0, 50);
    progress.session = null;
    const existing = progress.savedQuizzes ?? [];
    const filtered = existing.filter((q) => q.documentName !== session.documentName);
    progress.savedQuizzes = [
      { id: session.documentId, documentName: session.documentName, questions: session.questions, savedAt: Date.now() },
      ...filtered,
    ].slice(0, 20);
  } else {
    progress.session = session;
  }
  save(progress);
}

export function getSavedQuizzes(): import('./types').SavedQuiz[] {
  return getProgress().savedQuizzes ?? [];
}

export function saveQuiz(documentId: string, documentName: string, questions: import('./types').QuizQuestion[]): void {
  const progress = getProgress();
  const existing = progress.savedQuizzes ?? [];
  const filtered = existing.filter((q) => q.documentName !== documentName);
  progress.savedQuizzes = [
    { id: documentId, documentName, questions, savedAt: Date.now() },
    ...filtered,
  ].slice(0, 20);
  save(progress);
}

export function forgetQuiz(id: string): void {
  const progress = getProgress();
  progress.savedQuizzes = (progress.savedQuizzes ?? []).filter((q) => q.id !== id);
  save(progress);
}

export function getSession(): QuizSession | null {
  return getProgress().session;
}

export function getStreak(): number {
  return getProgress().streak;
}

export function getHistory(): QuizSession[] {
  return getProgress().history;
}

export function getMyNotes(): MyNote[] {
  return getProgress().myNotes ?? [];
}

export function saveMyNotes(notes: MyNote[]): void {
  const progress = getProgress();
  progress.myNotes = notes;
  save(progress);
}

export function addMyNote(note: MyNote): void {
  const progress = getProgress();
  progress.myNotes = [note, ...(progress.myNotes ?? [])].slice(0, 30);
  save(progress);
}

export function updateMyNote(id: string, update: Partial<MyNote>): void {
  const progress = getProgress();
  const notes = progress.myNotes ?? [];
  const idx = notes.findIndex((n) => n.id === id);
  if (idx >= 0) {
    notes[idx] = { ...notes[idx], ...update };
    progress.myNotes = notes;
    save(progress);
  }
}

export function removeMyNote(id: string): void {
  const progress = getProgress();
  progress.myNotes = (progress.myNotes ?? []).filter((n) => n.id !== id);
  save(progress);
}
