import { useState } from 'react';
import { api } from '../lib/api';
import { useLang } from '../context/LangContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const { t } = useLang();

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setMsg({ type: 'error', key: 'newsletter.invalidEmail' });
      return;
    }
    setBusy(true);
    try {
      // Server is the source of truth (D1 `newsletter` table): returns
      // `welcome` for a new subscriber or `already` when the email exists.
      const data = await api('/api/newsletter', { method: 'POST', body: { email: value } });
      setEmail('');
      setMsg({ type: data.message === 'already' ? 'info' : 'success', key: `newsletter.${data.message}` });
    } catch (error) {
      setMsg({ type: 'error', key: error.status === 400 ? 'newsletter.invalidEmail' : 'newsletter.failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="newsletter">
      <div className="container newsletter-inner">
        <div>
          <p className="eyebrow">{t('newsletter.eyebrow')}</p>
          <h2>{t('newsletter.title')}</h2>
          <p className="muted">{t('newsletter.hint')}</p>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="newsletter-row">
            <input
              type="email"
              placeholder={t('newsletter.placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label={t('newsletter.placeholder')}
              disabled={busy}
            />
            <button className="btn" type="submit" disabled={busy}>
              {t('newsletter.subscribe')}
            </button>
          </div>
          {msg && (
            <p className={`form-msg ${msg.type}`} role="status">
              {t(msg.key)}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
