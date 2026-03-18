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

export interface SavedQuiz {
  id: string;
  documentName: string;
  questions: QuizQuestion[];
  savedAt: number;
}

export interface MyNote {
  id: string;
  documentName: string;
  status: 'loading' | 'ready' | 'failed';
  progress?: number;
  error?: string;
  questions?: QuizQuestion[];
  documentId?: string;
  createdAt: number;
}

export interface StoredProgress {
  session: QuizSession | null;
  history: QuizSession[];
  savedQuizzes: SavedQuiz[];
  myNotes: MyNote[];
  streak: number;
  lastVisitDate: string; // YYYY-MM-DD
}

export interface ExplainResponse {
  explanation: string;
  tip: string;
}
