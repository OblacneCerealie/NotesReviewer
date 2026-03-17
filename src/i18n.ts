export type Locale = 'en' | 'cs';

export const translations = {
  en: {
    appTitle: 'Notes Reviewer',
    tagline: 'Upload your Q&A document, get quizzed one question at a time.',
    streakTitle: 'Learning streak (days in a row)',
    streakDays: '{n} day streak',
    chooseFile: 'Choose file (max {max} MB)',
    fileName: '{name} ({size} KB)',
    startQuiz: 'Start quiz',
    parsingWithAI: 'Parsing with AI…',
    chooseFileFirst: 'Choose a file first',
    noQuestionsFound: 'No questions found in the document. Use a file with clear questions and answer options.',
    uploadFailed: 'Upload failed',
    fileTooLarge: 'File must be under {max} MB',
    sessionInProgress: 'You have a session in progress',
    resumeQuiz: 'Resume quiz',
    recentSessions: 'Recent sessions',
    answeredCorrect: '{total} answered, {correct} correct',
    enterPassword: 'Enter password',
    friendsOnly: 'This app is shared with friends only.',
    wrongPassword: 'Wrong password',
    enter: 'Enter',
    password: 'Password',
    loadExplanationFailed: 'Could not load explanation.',
    loading: 'Loading…',
    questionOf: 'Question {current} of {total}',
    correct: 'Correct!',
    explanation: 'Explanation',
    tipToRemember: 'Tip to remember',
    nextQuestion: 'Next question',
    loadingExplanation: 'Loading explanation…',
    sessionComplete: 'Session complete',
    stats: '{correct} correct, {wrong} wrong',
    backToHome: 'Back to home',
  },
  cs: {
    appTitle: 'Přehled poznámek',
    tagline: 'Nahrajte dokument s otázkami a odpověďmi, procvičujte jednu otázku najednou.',
    streakTitle: 'Série dnů učení',
    streakDays: '{n} dní v řadě',
    chooseFile: 'Vybrat soubor (max {max} MB)',
    fileName: '{name} ({size} KB)',
    startQuiz: 'Spustit kvíz',
    parsingWithAI: 'Zpracovává AI…',
    chooseFileFirst: 'Nejprve vyberte soubor',
    noQuestionsFound: 'V dokumentu nebyly nalezeny žádné otázky. Použijte soubor s jasnými otázkami a možnostmi odpovědí.',
    uploadFailed: 'Nahrání selhalo',
    fileTooLarge: 'Soubor musí mít méně než {max} MB',
    sessionInProgress: 'Máte rozpracované cvičení',
    resumeQuiz: 'Pokračovat',
    recentSessions: 'Nedávné cvičení',
    answeredCorrect: '{total} zodpovězeno, {correct} správně',
    enterPassword: 'Zadejte heslo',
    friendsOnly: 'Tato aplikace je sdílená pouze s přáteli.',
    wrongPassword: 'Nesprávné heslo',
    enter: 'Vstoupit',
    password: 'Heslo',
    loading: 'Načítání…',
    questionOf: 'Otázka {current} z {total}',
    correct: 'Správně!',
    explanation: 'Vysvětlení',
    tipToRemember: 'Tip na zapamatování',
    nextQuestion: 'Další otázka',
    loadingExplanation: 'Načítání vysvětlení…',
    sessionComplete: 'Cvičení dokončeno',
    stats: '{correct} správně, {wrong} špatně',
    backToHome: 'Zpět na úvod',
    loadExplanationFailed: 'Nepodařilo se načíst vysvětlení.',
  },
} as const;

const STORAGE_KEY = 'app_locale';

export function getLocale(): Locale {
  if (typeof localStorage === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'cs' || stored === 'en') return stored;
  return navigator.language.startsWith('cs') ? 'cs' : 'en';
}

export function setLocale(locale: Locale): void {
  localStorage?.setItem(STORAGE_KEY, locale);
}

export function t(locale: Locale, key: keyof typeof translations.en, params?: Record<string, string | number>): string {
  let s: string = (translations[locale][key] ?? translations.en[key] ?? key) as string;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(`{${k}}`, String(v));
    }
  }
  return s;
}
