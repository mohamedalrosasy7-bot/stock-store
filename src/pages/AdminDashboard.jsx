import { useEffect, useRef, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useLang } from '../context/LangContext';
import { Link } from 'react-router-dom';
import { money } from '../config';
import { coverImage, getCategoryName, IMAGES, sortByNewest } from '../data/products';
import { EditIcon, PackageIcon, TagIcon, UsersIcon, ClockIcon } from '../components/Icons';
import { isAllowedImage, uploadStoreImage } from '../lib/images';
import { resources } from '../i18n';

const MAX_STORE_IMAGE_SIZE = 8 * 1024 * 1024;
const OFFER_COPY_FIELDS = [
  { key: 'eyebrow', label: 'admin.offerEyebrow', maxLength: 100 },
  { key: 'title', label: 'admin.offerHeading', maxLength: 240 },
  { key: 'description', label: 'admin.offerDescription', maxLength: 500 },
  { key: 'button', label: 'admin.offerButton', maxLength: 100 },
];
const DEFAULT_OFFER_COPY = {
  ar: {
    eyebrow: resources.ar.home.specialOffer,
    title: resources.ar.home.offerTitle,
    description: resources.ar.home.offerText,
    button: resources.ar.home.shopSale,
  },
  en: {
    eyebrow: resources.en.home.specialOffer,
    title: resources.en.home.offerTitle,
    description: resources.en.home.offerText,
    button: resources.en.home.shopSale,
  },
};

function AdminImageSetting({ image, defaultImage, title, hint, changeLabel, restoreLabel, onSave, t }) {
  const inputRef = useRef(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setUploadError('');
    if (!file) return;
    if (!isAllowedImage(file)) {
      setUploadError('admin.onlyImages');
      return;
    }
    if (file.size > MAX_STORE_IMAGE_SIZE) {
      setUploadError('admin.storeImageTooLarge');
      return;
    }
    setUploading(true);
    try {
      await onSave(await uploadStoreImage(file));
    } catch {
      setUploadError('admin.storeImageSaveFailed');
    } finally {
      setUploading(false);
    }
  };

  const restoreDefault = async () => {
    setUploadError('');
    setUploading(true);
    try {
      await onSave('');
    } catch {
      setUploadError('admin.storeImageSaveFailed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="admin-card admin-card-wide admin-hero-settings">
      <div className="admin-section-head">
        <div>
          <h2>{title}</h2>
          <p className="admin-subtitle">{hint}</p>
        </div>
        <div className="admin-hero-actions">
          <button
            type="button"
            className="btn btn-lg admin-btn-accent"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <span>{uploading ? t('admin.uploading') : changeLabel}</span>
          </button>
          {image && (
            <button type="button" className="btn btn-outline" onClick={restoreDefault} disabled={uploading}>
              {restoreLabel}
            </button>
          )}
          <input
            ref={inputRef}
            className="admin-category-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={handleFile}
            aria-label={changeLabel}
          />
        </div>
      </div>
      {uploadError && <p className="admin-field-error" role="alert">{t(uploadError)}</p>}
      <img className="admin-hero-preview" src={image || defaultImage} alt={title} />
    </section>
  );
}

function AdminOfferCopy({ offerContent, onSave, t }) {
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const valueFor = (locale, key) =>
    draft[locale]?.[key] ?? offerContent?.[locale]?.[key] ?? DEFAULT_OFFER_COPY[locale][key];

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    const content = Object.fromEntries(['ar', 'en'].map((locale) => [
      locale,
      Object.fromEntries(OFFER_COPY_FIELDS.map(({ key }) => [key, valueFor(locale, key)])),
    ]));
    try {
      await onSave(content);
      setDraft(content);
    } catch {
      setSaveError('admin.offerCopySaveFailed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-card admin-card-wide">
      <div className="admin-section-head">
        <div>
          <h2>{t('admin.offerCopyTitle')}</h2>
          <p className="admin-subtitle">{t('admin.offerCopyHint')}</p>
        </div>
      </div>
      <form onSubmit={save}>
        <div className="admin-offer-copy-grid">
          {['ar', 'en'].map((locale) => (
            <fieldset key={locale} className="admin-offer-copy-locale" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              <legend>{t(locale === 'ar' ? 'admin.offerArabic' : 'admin.offerEnglish')}</legend>
              <div className="admin-offer-copy-fields">
                {OFFER_COPY_FIELDS.map(({ key, label, maxLength }) => (
                  <label key={key} className="admin-field">
                    <span>{t(label)}</span>
                    {key === 'description' ? (
                      <textarea
                        rows={3}
                        maxLength={maxLength}
                        value={valueFor(locale, key)}
                        onChange={(event) => setDraft((current) => ({
                          ...current,
                          [locale]: { ...(current[locale] || {}), [key]: event.target.value },
                        }))}
                      />
                    ) : (
                      <input
                        type="text"
                        maxLength={maxLength}
                        value={valueFor(locale, key)}
                        onChange={(event) => setDraft((current) => ({
                          ...current,
                          [locale]: { ...(current[locale] || {}), [key]: event.target.value },
                        }))}
                      />
                    )}
                    {key === 'title' && <small className="muted">{t('admin.offerPercentHint')}</small>}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        {saveError && <p className="admin-field-error" role="alert">{t(saveError)}</p>}
        <div className="admin-form-actions">
          <button type="button" className="btn btn-outline" onClick={() => setDraft(DEFAULT_OFFER_COPY)}>
            {t('admin.restoreDefaultOfferText')}
          </button>
          <button type="submit" className="btn btn-lg admin-btn-accent" disabled={saving}>
            {saving ? t('admin.saving') : t('admin.saveChanges')}
          </button>
        </div>
      </form>
    </section>
  );
}

const STAT_CARDS = [
  { labelKey: 'admin.statTotalProducts', icon: <PackageIcon size={20} />, color: 'var(--accent)' },
  { labelKey: 'admin.statActive', icon: <UsersIcon size={20} />, color: 'var(--success)' },
  { labelKey: 'admin.statHidden', icon: <ClockIcon size={20} />, color: 'var(--muted)' },
  { labelKey: 'admin.statOnSale', icon: <TagIcon size={20} />, color: 'var(--danger)' },
];

export default function AdminDashboard() {
  const { t, lang } = useLang();
  const {
    products, categories, heroImage, updateHeroImage, offerImage, updateOfferImage,
    offerContent, updateOfferContent,
    status, statusMsg, clearStatus,
  } = useAdmin();

  // Same snappy auto-dismiss as the other admin pages (1.5s).
  useEffect(() => {
    if (!status) return undefined;
    const timer = setTimeout(clearStatus, 1500);
    return () => clearTimeout(timer);
  }, [status, clearStatus]);

  const total = products.length;
  const active = products.filter((p) => p.active !== false).length;
  const hidden = products.filter((p) => p.active === false).length;
  const onSale = products.filter((p) => p.salePrice != null).length;

  const stats = [
    { ...STAT_CARDS[0], value: total },
    { ...STAT_CARDS[1], value: active },
    { ...STAT_CARDS[2], value: hidden },
    { ...STAT_CARDS[3], value: onSale },
  ].map((s) => ({ ...s, label: t(s.labelKey) }));

  const catCounts = categories.map((c) => ({
    id: c.id,
    label: getCategoryName(c, lang),
    count: products.filter((p) => p.category === c.id).length,
  }));

  const recent = sortByNewest(products).slice(0, 6);

  const categoryLabel = (id) => {
    const cat = categories.find((c) => c.id === id);
    return cat ? getCategoryName(cat, lang) : id;
  };
  const firstImage = coverImage;
  return (
    <div className="admin-page">
      {status && statusMsg && (
        <div className={`admin-toast admin-toast--${status}`} onClick={clearStatus}>
          <span className="admin-toast-icon">{status === 'error' ? '!' : '✓'}</span>
          <span className="admin-toast-msg">{t(statusMsg)}</span>
        </div>
      )}

      <div className="admin-page-head">
        <div>
          <h2>{t('admin.dashboard')}</h2>
          <p className="admin-subtitle">{t('admin.dashboardSubtitle')}</p>
        </div>
        <Link to="/admin/products/add" className="btn btn-lg btn-primary">
          <span>+ {t('admin.addProduct')}</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="admin-stat">
            <div className="admin-stat-icon" style={{ color: s.color, background: `${s.color}15` }}>
              {s.icon}
            </div>
            <div className="admin-stat-info">
              <p className="admin-stat-label">{s.label}</p>
              <p className="admin-stat-value">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <AdminImageSetting
        image={heroImage}
        defaultImage={IMAGES.hero}
        title={t('admin.homeHeroImage')}
        hint={t('admin.homeHeroImageHint')}
        changeLabel={t('admin.changeHeroImage')}
        restoreLabel={t('admin.restoreDefaultHero')}
        onSave={updateHeroImage}
        t={t}
      />
      <AdminImageSetting
        image={offerImage}
        defaultImage={IMAGES.banner}
        title={t('admin.homeOfferImage')}
        hint={t('admin.homeOfferImageHint')}
        changeLabel={t('admin.changeOfferImage')}
        restoreLabel={t('admin.restoreDefaultOffer')}
        onSave={updateOfferImage}
        t={t}
      />
      <AdminOfferCopy offerContent={offerContent} onSave={updateOfferContent} t={t} />

      <div className="admin-grid">
        {/* Category breakdown */}
        <div className="admin-card admin-card-wide">
          <div className="admin-section-head">
            <h2>{t('admin.productsByCategory')}</h2>
            <span className="admin-subtitle">{t('admin.catalogBreakdown')}</span>
          </div>
          <div className="admin-cat-grid">
            {catCounts.map((c) => (
              <div key={c.id} className="admin-cat-card">
                <span className="admin-cat-label">{categoryLabel(c.id)}</span>
                <span className="admin-cat-value">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recently added */}
        <div className="admin-card admin-card-wide">
          <div className="admin-section-head">
            <h2>{t('admin.recentlyAdded')}</h2>
            <span className="admin-subtitle">{t('admin.quickLinksEdit')}</span>
          </div>
          <div className="admin-recent-list">
            {recent.map((p) => (
              <div key={p.id} className="admin-recent-item">
                {firstImage(p)
                  ? <img src={firstImage(p)} alt={p.name} className="admin-recent-img" />
                  : <div className="admin-recent-img" aria-label={t('admin.noProductImage')} />}
                <div className="admin-recent-info">
                  <span className="admin-recent-name">{p.name}</span>
                  <span className="admin-recent-cat muted small">{categoryLabel(p.category)}</span>
                </div>
                <div className="admin-recent-price">{money(p.salePrice ?? p.price)}</div>
                <Link
                  to={`/admin/products/edit/${p.id}`}
                  className="admin-recent-edit"
                  aria-label={t('admin.editProductAria', { name: p.name })}
                >
                  <EditIcon size={16} />
                </Link>
              </div>
            ))}
            {recent.length === 0 && (
              <div className="admin-empty">
                <p className="muted">{t('admin.noProductsYet')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}