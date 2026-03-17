import { useState, useEffect } from 'react';
import { checkAuth, setStoredPassword } from '../api';
import { useLocale } from '../LocaleContext';
import { t } from '../i18n';
import './AuthGate.css';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { locale, setLocale } = useLocale();
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
      setError(t(locale, 'wrongPassword'));
    }
  };

  if (authorized === null) {
    return (
      <div className="auth-gate auth-gate-loading">
        <span>{t(locale, 'loading')}</span>
      </div>
    );
  }

  if (authorized) {
    return <>{children}</>;
  }

  return (
    <div className="auth-gate">
      <div className="auth-gate-box">
        <div className="lang-switcher">
          <button type="button" className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>EN</button>
          <button type="button" className={locale === 'cs' ? 'active' : ''} onClick={() => setLocale('cs')}>ČS</button>
        </div>
        <h2>{t(locale, 'enterPassword')}</h2>
        <p>{t(locale, 'friendsOnly')}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(locale, 'password')}
            autoFocus
          />
          {error && <p className="auth-gate-error">{error}</p>}
          <button type="submit">{t(locale, 'enter')}</button>
        </form>
      </div>
    </div>
  );
}
