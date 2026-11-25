import { useEffect, useRef, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useLang } from '../context/LangContext';
import { isAllowedImage, uploadStoreImage } from '../lib/images';
import { ArrowIcon, EyeIcon, EyeOffIcon, ImageIcon, PlusIcon, TrashIcon } from '../components/Icons';
import { cloudinaryUrl } from '../config';

export default function AdminAds() {
  const { t } = useLang();
  const {
    shopAds,
    addAdBanners,
    toggleShopAds,
    toggleAdBanner,
    deleteAdBanner,
    moveAdBanner,
    status,
    statusMsg,
    clearStatus,
  } = useAdmin();
  const inputRef = useRef(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (!status) return undefined;
    const timer = setTimeout(clearStatus, 1500);
    return () => clearTimeout(timer);
  }, [status, clearStatus]);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    setUploadError('');
    if (!files.length) return;

    const validFiles = files.filter(isAllowedImage);
    if (validFiles.length !== files.length) {
      setUploadError('admin.onlyImages');
    }
    if (!validFiles.length) return;

    const results = await Promise.allSettled(validFiles.map(async (file, index) => ({
      id: `ad-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      src: await uploadStoreImage(file),
      active: true,
    })));
    const banners = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
    if (banners.length) addAdBanners(banners);
    if (results.some((result) => result.status === 'rejected')) setUploadError('admin.imageUploadFailed');
  };

  const activeCount = shopAds.banners.filter((banner) => banner.active !== false).length;

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
          <h2>{t('admin.advertisements')}</h2>
          <p className="admin-page-sub">{t('admin.manageBanner')}</p>
        </div>
        <button type="button" className="btn btn-lg admin-btn-accent" onClick={() => inputRef.current?.click()}>
          <PlusIcon size={17} />
          <span>{t('admin.addAdImages')}</span>
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} hidden />
      </div>

      <section className="admin-card admin-ad-settings">
        <div>
          <h3>{t('admin.shopAdSpace')}</h3>
          <p>{t('admin.shopAdSpaceHint')}</p>
          <span className={`admin-ad-state ${shopAds.enabled ? 'is-visible' : 'is-hidden'}`}>
            {shopAds.enabled ? t('admin.adSpaceEnabled') : t('admin.adSpaceHidden')}
          </span>
        </div>
        <button type="button" className="btn btn-outline" onClick={toggleShopAds}>
          {shopAds.enabled ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          {shopAds.enabled ? t('admin.hideAdSpace') : t('admin.showAdSpace')}
        </button>
      </section>

      {uploadError && <p className="admin-field-error" role="alert">{t(uploadError)}</p>}

      <section className="admin-card">
        <div className="admin-section-head admin-ad-list-head">
          <div>
            <h2>{t('admin.adImages')}</h2>
            <p className="admin-subtitle">{t('admin.adImagesSubtitle', { active: activeCount, total: shopAds.banners.length })}</p>
          </div>
          {shopAds.banners.length > 1 && <span className="admin-ad-hint">{t('admin.useArrows')}</span>}
        </div>

        {shopAds.banners.length ? (
          <div className="admin-ad-list">
            {shopAds.banners.map((banner, index) => {
              const active = banner.active !== false;
              return (
                <article key={banner.id} className={`admin-ad-item ${active ? '' : 'is-inactive'}`}>
                  <img src={cloudinaryUrl(banner.src, { width: 360 })} alt={banner.name || t('admin.adPreview')} />
                  <div className="admin-ad-item-info">
                    <strong>{banner.name || t('admin.advertisementN', { index: index + 1 })}</strong>
                    <span>{active ? t('admin.includedInSlider') : t('admin.hiddenFromSlider')}</span>
                  </div>
                  <div className="admin-ad-item-actions">
                    <button type="button" className="admin-icon-btn" onClick={() => moveAdBanner(banner.id, -1)} disabled={index === 0} aria-label={t('admin.moveUpAria', { name: banner.name || t('admin.advertisementN', { index: index + 1 }) })}>
                      <ArrowIcon size={16} style={{ transform: 'rotate(-90deg)' }} />
                    </button>
                    <button type="button" className="admin-icon-btn" onClick={() => moveAdBanner(banner.id, 1)} disabled={index === shopAds.banners.length - 1} aria-label={t('admin.moveDownAria', { name: banner.name || t('admin.advertisementN', { index: index + 1 }) })}>
                      <ArrowIcon size={16} style={{ transform: 'rotate(90deg)' }} />
                    </button>
                    <button type="button" className="admin-icon-btn" onClick={() => toggleAdBanner(banner.id)} aria-label={t(active ? 'admin.hideAriaNamed' : 'admin.showAriaNamed', { name: banner.name || t('admin.advertisementN', { index: index + 1 }) })}>
                      {active ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                    <button type="button" className="admin-icon-btn danger" onClick={() => deleteAdBanner(banner.id)} aria-label={t('admin.deleteAriaNamed', { name: banner.name || t('admin.advertisementN', { index: index + 1 }) })}>
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="admin-empty-state">
            <span className="admin-empty-icon"><ImageIcon size={24} /></span>
            <h3>{t('admin.noAdImages')}</h3>
            <p className="muted">{t('admin.noAdImagesHint')}</p>
            <button type="button" className="btn admin-btn-accent" onClick={() => inputRef.current?.click()}>
              <PlusIcon size={16} /> {t('admin.addAdImages')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
