import { Link } from 'react-router-dom';
import { STORE } from '../config';
import Newsletter from './Newsletter';
import { useLang } from '../context/LangContext';
import { FacebookIcon, InstagramIcon, TiktokIcon } from './Icons';

export default function Footer() {
  const { t } = useLang();
  const rightsParts = t('footer.rights', {
    year: new Date().getFullYear(),
    name: '__STORE_NAME__',
  }).split('__STORE_NAME__');
  return (
    <>
      <Newsletter />
      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-contact">
            <Link to="/" className="logo footer-logo brand-ltr" dir="ltr">
              <span className="logo-stoc">STOC</span><span className="logo-k" style={{ color: 'var(--accent)' }}>K</span><span className="logo-store">STORE</span>
            </Link>
            <p className="footer-about" dir="ltr" lang="en" style={{ color: '#000000', WebkitTextFillColor: '#000000', opacity: 1 }}>Always In STOCK Never In Line</p>
            <div className="socials">
              <a href={STORE.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramIcon /></a>
              <a href={STORE.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FacebookIcon /></a>
              <a href={STORE.social.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><TiktokIcon /></a>
            </div>
          </div>
          <div>
            <h4>{t('footer.contact')}</h4>
            {STORE.stores.map((store) => (
              <span key={store.key} className="footer-address">
                {t(`footer.stores.${store.key}`)}: <bdi dir="rtl">المحمودية، البحيرة - {store.address}</bdi>
              </span>
            ))}
            <a href={`tel:${STORE.phone.replace(/\s/g, '')}`}>{STORE.phone}</a>
            <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
            <span>{t('footer.hours')}</span>
          </div>
        </div>
        <div className="container footer-bottom">
          <div className="footer-credit">
            <span>{t('footer.designedBy')}</span>
            <bdi className="footer-credit-names" dir="ltr">
              <strong>Mohanad 5alil</strong>
              <strong>Mostafa Moghazy</strong>
            </bdi>
          </div>
          <span className="footer-copyright">
            {rightsParts[0]}
            <bdi className="brand-ltr" dir="ltr">{STORE.name}</bdi>
            {rightsParts[1]}
          </span>
        </div>
      </footer>
    </>
  );
}
