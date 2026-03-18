export const translations = {
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
  skip: 'Přeskočit',
  back: 'Zpět',
  endQuiz: 'Ukončit kvíz',
  previous: 'Předchozí',
  next: 'Další',
  exit: 'Ukončit',
  savedQuizzes: 'Uložené kvízy',
  forget: 'Zapomenout',
  startFromSaved: 'Spustit',
  tabUpload: 'Nahrát',
  tabMyNotes: 'Moje poznámky',
  openQuiz: 'Otevřít kvíz',
  parsingProgress: 'Zpracovávání… {p}%',
  remove: 'Odebrat',
  noNotesYet: 'Zatím žádné poznámky. Nahrajte soubor.',
  uploadInterrupted: 'Nahrávání bylo přerušeno',
} as const;

export function t(key: keyof typeof translations, params?: Record<string, string | number>): string {
  let s: string = translations[key] as string;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(`{${k}}`, String(v));
    }
  }
  return s;
}
