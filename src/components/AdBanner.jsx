import { useEffect, useRef, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useLang } from '../context/LangContext';

export default function AdBanner() {
  const { t } = useLang();
  const { shopAds } = useAdmin();
  const activeBanners = shopAds.banners.filter((banner) => banner.active !== false);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStart = useRef(null);

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    if (!touchStart.current || activeBanners.length < 2) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    setActiveIndex((index) => (index + (deltaX < 0 ? 1 : -1) + activeBanners.length) % activeBanners.length);
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [activeBanners.length]);

  useEffect(() => {
    if (activeBanners.length < 2) return undefined;
    const timer = setTimeout(() => {
      setActiveIndex((index) => (index + 1) % activeBanners.length);
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeBanners.length, activeIndex]);

  if (!shopAds.enabled) return null;

  const banner = activeBanners[activeIndex % Math.max(activeBanners.length, 1)];

  return (
    <section
      className="shop-ad-slot"
      aria-label={t('admin.advertisements')}
      aria-roledescription="carousel"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { touchStart.current = null; }}
    >
      {banner && (
        <>
          <img
            key={banner.id}
            src={banner.src}
            alt={banner.name || t('admin.advertisements')}
            className="shop-ad-image"
          />
          {banner.headline && (
            <div className="shop-ad-copy" aria-hidden="true">
              <span className="shop-ad-eyebrow">{banner.eyebrow}</span>
              <strong>{banner.headline}</strong>
              <span className="shop-ad-subtext">{banner.subtext}</span>
            </div>
          )}
        </>
      )}
      {activeBanners.length > 1 && (
        <div className="shop-ad-dots" role="tablist" aria-label={t('admin.advertisements')}>
          {activeBanners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              className={`shop-ad-dot${i === activeIndex ? ' is-active' : ''}`}
              onClick={() => setActiveIndex(i)}
              aria-label={t('admin.advertisementN', { index: i + 1 })}
            />
          ))}
        </div>
      )}
    </section>
  );
}
