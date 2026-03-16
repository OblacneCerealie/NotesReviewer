import type { QuizSession, StoredProgress } from './types';

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
  } else {
    progress.session = session;
  }
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
