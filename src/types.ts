export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface QuizSession {
  documentId: string;
  documentName: string;
  questions: QuizQuestion[];
  currentIndex: number;
  correctCount: number;
  wrongCount: number;
  wrongAnswers: { questionIndex: number; selectedIndex: number }[];
  startedAt: number;
  lastActivityAt: number;
}

export interface StoredProgress {
  session: QuizSession | null;
  history: QuizSession[];
  streak: number;
  lastVisitDate: string; // YYYY-MM-DD
}

export interface ExplainResponse {
  explanation: string;
  tip: string;
}
