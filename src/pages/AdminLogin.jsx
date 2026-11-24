import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useLang } from '../context/LangContext';
import { IMAGES } from '../data/products';
import { ArrowIcon, EyeOffIcon, EyeIcon, ShieldIcon } from '../components/Icons';

export default function AdminLogin() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { login, isLoggedIn } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) navigate('/admin', { replace: true });
  }, [isLoggedIn, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) {
      navigate('/admin');
    } else {
      setError('admin.invalidCredentials');
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-shell">
        <aside className="admin-login-visual">
          <img className="admin-login-image" src={IMAGES.hero} alt="" />
          <div className="admin-login-visual-shade" />
          <div className="admin-login-visual-content">
            <div className="admin-login-wordmark brand-ltr" dir="ltr">STOCK<span>.</span></div>
            <div className="admin-login-visual-copy">
              <span className="admin-login-overline brand-ltr" dir="ltr">STOCK STORE · CONTROL ROOM</span>
              <h2>{t('admin.goodBusiness').split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < t('admin.goodBusiness').split('\n').length - 1 && <br />}
                </span>
              ))}</h2>
              <p>{t('admin.storeControl')}</p>
            </div>
            <span className="admin-login-visual-foot">{t('admin.consideredWay')}</span>
          </div>
        </aside>

        <section className="admin-login-panel">
          <button
            type="button"
            className="admin-login-back"
            onClick={() => navigate('/')}
          >
            <ArrowIcon size={16} />
            <span>{t('admin.backToStore')}</span>
          </button>

          <div className="admin-login-wrapper">
            <div className="admin-login-brand brand-ltr" dir="ltr">
              <span className="admin-login-brand-icon"><ShieldIcon size={21} /></span>
              <span className="logo-text">STOCK</span>
              <span className="admin-brand-sub">Admin</span>
            </div>

            <div className="admin-login-header">
              <span className="admin-login-kicker">{t('admin.welcomeBack')}</span>
              <h1>{t('admin.signInTitle').split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < t('admin.signInTitle').split('\n').length - 1 && <br />}
                </span>
              ))}</h1>
              <p className="admin-login-tagline">{t('admin.signInTagline')}</p>
            </div>

            {error && (
              <div className="admin-error" role="alert">
                <span className="admin-error-mark">!</span>
                <span>{t(error)}</span>
              </div>
            )}

            <form className="admin-login-form" onSubmit={handleSubmit} noValidate>
              <div className="admin-login-field">
                <label htmlFor="admin-email">{t('admin.username')}</label>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('admin.usernamePlaceholder')}
                  autoComplete="username"
                  aria-invalid={Boolean(error)}
                  required
                />
              </div>

              <div className="admin-login-field admin-login-password">
                <label htmlFor="admin-password">{t('admin.password')}</label>
                <div className="admin-login-password-wrap">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('admin.passwordPlaceholder')}
                    autoComplete="current-password"
                    aria-invalid={Boolean(error)}
                    required
                  />
                  <button
                    type="button"
                    className="admin-toggle-password"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? t('admin.hidePassword') : t('admin.showPassword')}
                  >
                    {showPassword ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="admin-login-submit"
                disabled={loading}
              >
                <span>{loading ? t('admin.signingIn') : t('admin.signIn')}</span>
                {!loading && <ArrowIcon size={18} />}
              </button>
            </form>

            <div className="admin-login-footnote">
              <ShieldIcon size={16} />
              <span>{t('admin.authorizedOnly')}</span>
            </div>
          </div>
          <span className="admin-login-copyright brand-ltr" dir="ltr">© 2026 STOCK STORE</span>
        </section>
      </div>
    </div>
  );
}