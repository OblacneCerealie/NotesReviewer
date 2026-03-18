import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseDocument } from '../api';
import { getProgress, saveSession, getMyNotes, addMyNote, updateMyNote, removeMyNote, saveMyNotes } from '../storage';
import type { QuizQuestion, MyNote } from '../types';
import { t } from '../i18n';
import './Home.css';

const isLocalhost = typeof window !== 'undefined' && /^localhost$|^127\.0\.0\.1$/.test(window.location.hostname);
const MAX_SIZE_MB = isLocalhost ? 50 : 3;
const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function Home() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'notes'>('upload');
  const [myNotes, setMyNotes] = useState<MyNote[]>(() => getMyNotes());
  const progress = getProgress();

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // On mount: reset any stale "loading" notes (e.g. after refresh during upload)
  useEffect(() => {
    const notes = getMyNotes();
    const hasStale = notes.some((n) => n.status === 'loading');
    if (hasStale) {
      const updated = notes.map((n) =>
        n.status === 'loading'
          ? { ...n, status: 'failed' as const, error: t('uploadInterrupted'), progress: undefined }
          : n
      );
      saveMyNotes(updated);
      setMyNotes(updated);
    }
  }, []);

  // Refresh myNotes when any are loading (to show progress)
  useEffect(() => {
    const hasLoading = getMyNotes().some((n) => n.status === 'loading');
    if (!hasLoading) return;
    const id = setInterval(() => setMyNotes(getMyNotes()), 250);
    return () => clearInterval(id);
  }, [myNotes]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(t('fileTooLarge', { max: String(MAX_SIZE_MB) }));
      setFile(null);
      return;
    }
    setFile(f);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) {
      setError(t('chooseFileFirst'));
      return;
    }
    setError('');
    const id = `${file.name}-${Date.now()}`;
    const note: MyNote = {
      id,
      documentName: file.name,
      status: 'loading',
      progress: 0,
      createdAt: Date.now(),
    };
    addMyNote(note);
    setMyNotes(getMyNotes());
    setActiveTab('notes');

    // Simulate progress (API doesn't support streaming)
    let progressVal = 0;
    progressIntervalRef.current = setInterval(() => {
      progressVal = Math.min(95, progressVal + 4 + Math.random() * 6);
      updateMyNote(id, { progress: Math.round(progressVal) });
    }, 300);

    try {
      const questions: QuizQuestion[] = await parseDocument(file);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (!questions.length) {
        updateMyNote(id, {
          status: 'failed',
          error: t('noQuestionsFound'),
          progress: undefined,
        });
        setMyNotes(getMyNotes());
        return;
      }
      const shuffledQuestions = shuffle(questions);
      const documentId = `${file.name}-${Date.now()}`;
      updateMyNote(id, {
        status: 'ready',
        progress: 100,
        questions: shuffledQuestions,
        documentId,
      });
      setMyNotes(getMyNotes());
    } catch (err) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      updateMyNote(id, {
        status: 'failed',
        error: err instanceof Error ? err.message : t('uploadFailed'),
        progress: undefined,
      });
      setMyNotes(getMyNotes());
    }
  }, [file]);

  const handleOpenQuiz = useCallback(
    (note: MyNote) => {
      if (note.status !== 'ready' || !note.questions?.length || !note.documentId) return;
      const session = {
        documentId: note.documentId,
        documentName: note.documentName,
        questions: note.questions,
        currentIndex: 0,
        correctCount: 0,
        wrongCount: 0,
        wrongAnswers: [],
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
      };
      saveSession(session);
      navigate('/quiz');
    },
    [navigate]
  );

  const handleRemoveNote = useCallback((id: string) => {
    removeMyNote(id);
    setMyNotes(getMyNotes());
  }, []);

  const resumeSession = useCallback(() => {
    if (progress.session) navigate('/quiz');
  }, [progress.session, navigate]);

  return (
    <div className="home">
      <header className="home-header">
        <h1>{t('appTitle')}</h1>
        <p className="tagline">{t('tagline')}</p>
        {progress.streak > 0 && (
          <div className="streak-badge" title={t('streakTitle')}>
            🔥 {t('streakDays', { n: String(progress.streak) })}
          </div>
        )}
      </header>

      <div className="home-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          {t('tabUpload')}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          {t('tabMyNotes')}
        </button>
      </div>

      {activeTab === 'upload' && (
        <section className="upload-section">
          <label className="file-label">
            <span className="file-button">{t('chooseFile', { max: String(MAX_SIZE_MB) })}</span>
            <input
              type="file"
              accept=".txt,.md,.pdf"
              onChange={onFileChange}
              className="file-input"
            />
          </label>
          {file && (
            <p className="file-name">
              {t('fileName', { name: file.name, size: (file.size / 1024).toFixed(1) })}
            </p>
          )}
          {error && <p className="error">{error}</p>}
          <button
            type="button"
            className="primary-button"
            onClick={handleUpload}
            disabled={!file}
          >
            {t('startQuiz')}
          </button>
        </section>
      )}

      {activeTab === 'notes' && (
        <section className="my-notes-section">
          {myNotes.length === 0 ? (
            <p className="no-notes">{t('noNotesYet')}</p>
          ) : (
            <ul className="my-notes-list">
              {myNotes.map((note) => (
                <li key={note.id} className="my-note-item" data-status={note.status}>
                  <div className="my-note-main">
                    <span className="my-note-name">{note.documentName}</span>
                    {note.status === 'loading' && (
                      <div className="my-note-progress">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${note.progress ?? 0}%` }}
                          />
                        </div>
                        <span className="my-note-progress-text">
                          {t('parsingProgress', { p: String(note.progress ?? 0) })}
                        </span>
                      </div>
                    )}
                    {note.status === 'ready' && (
                      <button
                        type="button"
                        className="primary-button primary-button-small"
                        onClick={() => handleOpenQuiz(note)}
                      >
                        {t('openQuiz')}
                      </button>
                    )}
                    {note.status === 'failed' && (
                      <div className="my-note-failed">
                        <span className="my-note-error">{note.error}</span>
                        <button
                          type="button"
                          className="my-note-remove"
                          onClick={() => handleRemoveNote(note.id)}
                          title={t('remove')}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {progress.session && progress.session.questions.length > 0 && (
        <section className="resume-section">
          <p>{t('sessionInProgress')}: {progress.session.documentName}</p>
          <button type="button" className="secondary-button" onClick={resumeSession}>
            {t('resumeQuiz')}
          </button>
        </section>
      )}

      {progress.history.length > 0 && (
        <section className="history-section">
          <h2>{t('recentSessions')}</h2>
          <ul className="history-list">
            {progress.history.slice(0, 5).map((s, i) => (
              <li key={s.documentId + i}>
                {s.documentName} — {t('answeredCorrect', { total: String(s.correctCount + s.wrongCount), correct: String(s.correctCount) })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
