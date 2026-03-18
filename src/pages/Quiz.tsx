import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExplanation } from '../api';
import { getSession, saveSession, saveQuiz } from '../storage';
import type { QuizQuestion as Q, QuizSession, ExplainResponse } from '../types';
import { t } from '../i18n';
import './Quiz.css';

export default function Quiz() {
  const navigate = useNavigate();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'correct' | 'wrong';
    explain?: ExplainResponse;
  } | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s || !s.questions?.length) {
      navigate('/');
      return;
    }
    setSession(s);
  }, [navigate]);

  const current = session?.questions[session.currentIndex] as Q | undefined;
  const isDone = session && session.currentIndex >= session.questions.length;

  const persist = useCallback((next: QuizSession) => {
    next.lastActivityAt = Date.now();
    setSession(next);
    saveSession(next);
  }, []);

  const handleAnswer = useCallback(
    async (selectedIndex: number) => {
      if (!session || current === undefined) return;
      const correct = selectedIndex === current.correctIndex;
      if (correct) {
        const next: QuizSession = {
          ...session,
          correctCount: session.correctCount + 1,
          lastActivityAt: Date.now(),
        };
        persist(next);
        setFeedback({ type: 'correct' });
        // Don't advance index yet; user clicks "Next question" to continue
      } else {
        setLoadingExplain(true);
        try {
          const explain = await getExplanation(
            current.question,
            current.options,
            current.correctIndex,
            selectedIndex
          );
          const next: QuizSession = {
            ...session,
            wrongCount: session.wrongCount + 1,
            wrongAnswers: [
              ...session.wrongAnswers,
              { questionIndex: session.currentIndex, selectedIndex },
            ],
            lastActivityAt: Date.now(),
          };
          setSession(next);
          saveSession(next);
          setFeedback({ type: 'wrong', explain });
        } catch {
          setFeedback({ type: 'wrong', explain: { explanation: t('loadExplanationFailed'), tip: '' } });
        } finally {
          setLoadingExplain(false);
        }
      }
    },
    [session, current, persist]
  );

  const goNext = useCallback(() => {
    if (!session) return;
    const next: QuizSession = {
      ...session,
      currentIndex: session.currentIndex + 1,
      lastActivityAt: Date.now(),
    };
    persist(next);
    setFeedback(null);
  }, [session, persist]);

  // When correct: we did NOT advance index; user must click "Next question" to advance.
  const handleNextAfterCorrect = useCallback(() => {
    if (!session) return;
    const next: QuizSession = {
      ...session,
      currentIndex: session.currentIndex + 1,
      lastActivityAt: Date.now(),
    };
    persist(next);
    setFeedback(null);
  }, [session, persist]);

  const goBack = useCallback(() => {
    if (!session || session.currentIndex <= 0) return;
    const next: QuizSession = {
      ...session,
      currentIndex: session.currentIndex - 1,
      lastActivityAt: Date.now(),
    };
    persist(next);
    setFeedback(null);
  }, [session, persist]);

  const handleEndQuiz = useCallback(() => {
    if (!session) return;
    saveQuiz(session.documentId, session.documentName, session.questions);
    saveSession(null);
    navigate('/');
  }, [session, navigate]);

  if (!session) return null;

  if (isDone) {
    return (
      <div className="quiz quiz-done">
        <div className="done-card">
          <h2>{t('sessionComplete')}</h2>
          <p className="stats">
            {t('stats', { correct: String(session.correctCount), wrong: String(session.wrongCount) })}
          </p>
          <button type="button" className="primary-button" onClick={() => navigate('/')}>
            {t('backToHome')}
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const showFeedback = feedback?.type === 'wrong' && feedback.explain;

  return (
    <div className="quiz">
      <div className="quiz-progress">
        <span>
          {t('questionOf', { current: String(session.currentIndex + 1), total: String(session.questions.length) })}
        </span>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((session.currentIndex + 1) / session.questions.length) * 100}%` }}
          />
        </div>
      </div>

      <article className="question-card">
        <h2 className="question-text">{current.question}</h2>
        <div className="options">
          {current.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className="option"
              onClick={() => handleAnswer(i)}
              disabled={!!feedback || loadingExplain}
              data-correct={feedback?.type === 'correct' ? i === current.correctIndex : undefined}
              data-correct-option={showFeedback && i === current.correctIndex ? true : undefined}
              data-selected-wrong={showFeedback && i === session.wrongAnswers[session.wrongAnswers.length - 1]?.selectedIndex ? true : undefined}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="quiz-nav">
          <button type="button" className="nav-btn" onClick={goBack} disabled={session.currentIndex === 0}>
            {t('previous')}
          </button>
          <button type="button" className="nav-btn" onClick={goNext} disabled={!!feedback || loadingExplain}>
            {t('next')}
          </button>
          <button type="button" className="nav-btn nav-btn-end" onClick={handleEndQuiz}>
            {t('exit')}
          </button>
        </div>
      </article>

      {feedback?.type === 'correct' && (
        <div className="feedback correct">
          <span>{t('correct')}</span>
          <button type="button" className="primary-button" onClick={handleNextAfterCorrect}>
            {t('nextQuestion')}
          </button>
        </div>
      )}

      {showFeedback && feedback.explain && (
        <div className="feedback wrong">
          <h3>{t('explanation')}</h3>
          <p>{feedback.explain.explanation}</p>
          {feedback.explain.tip && (
            <>
              <h3>{t('tipToRemember')}</h3>
              <p className="tip">{feedback.explain.tip}</p>
            </>
          )}
          <button type="button" className="primary-button" onClick={goNext}>
            {t('nextQuestion')}
          </button>
        </div>
      )}

      {loadingExplain && (
        <div className="feedback wrong">
          <p>{t('loadingExplanation')}</p>
        </div>
      )}
    </div>
  );
}
