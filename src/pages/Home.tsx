import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseDocument } from '../api';
import { getProgress, saveSession } from '../storage';
import type { QuizQuestion } from '../types';
import { useLocale } from '../LocaleContext';
import { t } from '../i18n';
import './Home.css';

const isLocalhost = typeof window !== 'undefined' && /^localhost$|^127\.0\.0\.1$/.test(window.location.hostname);
const MAX_SIZE_MB = isLocalhost ? 50 : 3;
const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function Home() {
  const navigate = useNavigate();
  const { locale, setLocale } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const progress = getProgress();

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(t(locale, 'fileTooLarge', { max: String(MAX_SIZE_MB) }));
      setFile(null);
      return;
    }
    setFile(f);
  }, [locale]);

  const handleUpload = useCallback(async () => {
    if (!file) {
      setError(t(locale, 'chooseFileFirst'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const questions: QuizQuestion[] = await parseDocument(file);
      if (!questions.length) {
        setError(t(locale, 'noQuestionsFound'));
        setLoading(false);
        return;
      }
      const documentId = `${file.name}-${Date.now()}`;
      const session = {
        documentId,
        documentName: file.name,
        questions,
        currentIndex: 0,
        correctCount: 0,
        wrongCount: 0,
        wrongAnswers: [],
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
      };
      saveSession(session);
      navigate('/quiz');
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, 'uploadFailed'));
    } finally {
      setLoading(false);
    }
  }, [file, navigate, locale]);

  const resumeSession = useCallback(() => {
    if (progress.session) navigate('/quiz');
  }, [progress.session, navigate]);

  return (
    <div className="home">
      <header className="home-header">
        <div className="lang-switcher">
          <button type="button" className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>EN</button>
          <button type="button" className={locale === 'cs' ? 'active' : ''} onClick={() => setLocale('cs')}>ČS</button>
        </div>
        <h1>{t(locale, 'appTitle')}</h1>
        <p className="tagline">{t(locale, 'tagline')}</p>
        {progress.streak > 0 && (
          <div className="streak-badge" title={t(locale, 'streakTitle')}>
            🔥 {t(locale, 'streakDays', { n: String(progress.streak) })}
          </div>
        )}
      </header>

      <section className="upload-section">
        <label className="file-label">
          <span className="file-button">{t(locale, 'chooseFile', { max: String(MAX_SIZE_MB) })}</span>
          <input
            type="file"
            accept=".txt,.md,.pdf"
            onChange={onFileChange}
            disabled={loading}
            className="file-input"
          />
        </label>
        {file && (
          <p className="file-name">
            {t(locale, 'fileName', { name: file.name, size: (file.size / 1024).toFixed(1) })}
          </p>
        )}
        {error && <p className="error">{error}</p>}
        <button
          type="button"
          className="primary-button"
          onClick={handleUpload}
          disabled={!file || loading}
        >
          {loading ? t(locale, 'parsingWithAI') : t(locale, 'startQuiz')}
        </button>
      </section>

      {progress.session && progress.session.questions.length > 0 && (
        <section className="resume-section">
          <p>{t(locale, 'sessionInProgress')}: {progress.session.documentName}</p>
          <button type="button" className="secondary-button" onClick={resumeSession}>
            {t(locale, 'resumeQuiz')}
          </button>
        </section>
      )}

      {progress.history.length > 0 && (
        <section className="history-section">
          <h2>{t(locale, 'recentSessions')}</h2>
          <ul className="history-list">
            {progress.history.slice(0, 5).map((s, i) => (
              <li key={s.documentId + i}>
                {s.documentName} — {t(locale, 'answeredCorrect', { total: String(s.correctCount + s.wrongCount), correct: String(s.correctCount) })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
