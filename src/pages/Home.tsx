import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseDocument } from '../api';
import { getProgress, saveSession } from '../storage';
import type { QuizQuestion } from '../types';
import './Home.css';

const MAX_SIZE_MB = 50;
const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function Home() {
  const navigate = useNavigate();
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
      setError(`File must be under ${MAX_SIZE_MB} MB`);
      setFile(null);
      return;
    }
    setFile(f);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) {
      setError('Choose a file first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const questions: QuizQuestion[] = await parseDocument(file);
      if (!questions.length) {
        setError('No questions found in the document. Use a file with clear questions and answer options.');
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
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }, [file, navigate]);

  const resumeSession = useCallback(() => {
    if (progress.session) navigate('/quiz');
  }, [progress.session, navigate]);

  return (
    <div className="home">
      <header className="home-header">
        <h1>Notes Reviewer</h1>
        <p className="tagline">Upload your Q&amp;A document, get quizzed one question at a time.</p>
        {progress.streak > 0 && (
          <div className="streak-badge" title="Learning streak (days in a row)">
            🔥 {progress.streak} day streak
          </div>
        )}
      </header>

      <section className="upload-section">
        <label className="file-label">
          <span className="file-button">Choose file (max {MAX_SIZE_MB} MB)</span>
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
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
        {error && <p className="error">{error}</p>}
        <button
          type="button"
          className="primary-button"
          onClick={handleUpload}
          disabled={!file || loading}
        >
          {loading ? 'Parsing with AI…' : 'Start quiz'}
        </button>
      </section>

      {progress.session && progress.session.questions.length > 0 && (
        <section className="resume-section">
          <p>You have a session in progress: {progress.session.documentName}</p>
          <button type="button" className="secondary-button" onClick={resumeSession}>
            Resume quiz
          </button>
        </section>
      )}

      {progress.history.length > 0 && (
        <section className="history-section">
          <h2>Recent sessions</h2>
          <ul className="history-list">
            {progress.history.slice(0, 5).map((s, i) => (
              <li key={s.documentId + i}>
                {s.documentName} — {s.correctCount + s.wrongCount} answered, {s.correctCount} correct
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
