import { useState, useEffect } from 'react';
import { checkAuth, setStoredPassword } from '../api';
import { t } from '../i18n';
import './AuthGate.css';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth().then((ok) => setAuthorized(ok)).catch(() => setAuthorized(false));
  }, []);

  useEffect(() => {
    const onAuthRequired = () => setAuthorized(false);
    window.addEventListener('auth-required', onAuthRequired);
    return () => window.removeEventListener('auth-required', onAuthRequired);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setStoredPassword(password.trim());
    const ok = await checkAuth();
    if (ok) {
      setAuthorized(true);
      setError('');
    } else {
      setError(t('wrongPassword'));
    }
  };

  if (authorized === null) {
    return (
      <div className="auth-gate auth-gate-loading">
        <span>{t('loading')}</span>
      </div>
    );
  }

  if (authorized) {
    return <>{children}</>;
  }

  return (
    <div className="auth-gate">
      <div className="auth-gate-box">
        <h2>{t('enterPassword')}</h2>
        <p>{t('friendsOnly')}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('password')}
            autoFocus
          />
          {error && <p className="auth-gate-error">{error}</p>}
          <button type="submit">{t('enter')}</button>
        </form>
      </div>
    </div>
  );
}
