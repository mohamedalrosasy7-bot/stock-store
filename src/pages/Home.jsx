import { Link } from 'react-router-dom';
import { IMAGES, getCategoryName, sortByNewest } from '../data/products';
import { STORE } from '../config';
import { useAdmin } from '../context/AdminContext';
import { useLang } from '../context/LangContext';
import { useSEO } from '../hooks/useSEO';
import ProductSection from '../components/ProductSection';
import Reveal from '../components/Reveal';
import LanguageToggle from '../components/LanguageToggle';
import { ArrowIcon, CashIcon, ReturnIcon, ShieldIcon, TruckIcon } from '../components/Icons';

// 24x36 JPEG of the hero, ~850 bytes, inlined so the hero never shows a blank/dark box
const HERO_LQIP = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDABQODxIPDRQSERIXFhQYHzMhHxwcHz8tLyUzSkFOTUlBSEZSXHZkUldvWEZIZoxob3p9hIWET2ORm4+AmnaBhH//2wBDARYXFx8bHzwhITx/VEhUf39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3//wAARCAAkABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAwAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDmYUVNj7h94jIOOMe/8qlNl5674F2tnp0/T/CpCkUiWyqV8tVUvjjnA/WrTJYuXKebbEDhk+dP15FZuWpoo6GQVkQKHBAPQjpRVgyOpMUseGxw2TxjpRWiZDRJabY7dg5T5yvBPQc81PCofyMlVzId3bAwOTS6dbR3bb5ZljKnBDE7mAGev+elWDpMAKtJfRuCSeMkkY6VDiUmZl4pMMbLIrbSckN16etFXL6witLUyLcxyur4ICkZHbFFXFWRLZm2spRjgDhT1HtTYvnnUHoWFFFIB07bIwoVeuc0UUU1sJn/2Q==';

const FEATURE_ICONS = [
  { icon: TruckIcon, titleKey: 'features.fastDelivery', textKey: 'features.fastDeliveryText' },
  { icon: CashIcon, titleKey: 'features.cod', textKey: 'features.codText' },
  { icon: ReturnIcon, titleKey: 'features.returns', textKey: 'features.returnsText' },
  { icon: ShieldIcon, titleKey: 'features.quality', textKey: 'features.qualityText' },
];

export default function Home() {
  useSEO(null);
  const { t, lang } = useLang();
  const { products, categories, isSeasonHidden, heroImage, offerImage, offerContent } = useAdmin();
  const visible = products.filter((p) => p.active !== false && !isSeasonHidden(p.season));
  // Each home section shows the 6 newest products the admin added (by
  // createdAt, newest first); the "View all" arrow link leads to the rest.
  const newArrivals = sortByNewest(visible).slice(0, 6);
  const onSale = sortByNewest(visible.filter((p) => p.salePrice != null));
  const heroSrc = heroImage || IMAGES.hero;
  const offerCopy = offerContent?.[lang] || {};
  const offerTitle = offerCopy.title ?? t('home.offerTitle');
  const reviews = t('reviews');
  const features = FEATURE_ICONS.map(({ icon, titleKey, textKey }) => ({
    icon,
    title: t(titleKey),
    text:
      textKey === 'features.fastDeliveryText'
        ? t(titleKey, {
            amount: STORE.freeShippingThreshold.toLocaleString('en-US'),
            currency: STORE.currency,
          })
        : t(textKey),
  }));

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <LanguageToggle className="lang-toggle-hero" />
          <p className="eyebrow light" dir="rtl" lang="ar">مش مجرد لبس</p>
          <h1>{t('hero.h1Line1')} <span>{t('hero.h1Line2')}</span></h1>
          <p className="hero-sub">
            {t('hero.subLine1')}
            <span>{t('hero.subLine2')}</span>
          </p>
          <div className="hero-actions">
            <Link to="/shop" className="btn btn-light btn-lg">
              {t('hero.shopNow')} <ArrowIcon size={18} />
            </Link>
            <Link to="/shop?sort=newest" className="btn btn-ghost btn-lg">
              {t('hero.newArrivals')}
            </Link>
          </div>
        </div>
        <div className="hero-media">
          {/* LQIP: tiny blurred placeholder painted instantly; the full image fades in once loaded */}
          {!heroImage && <img className="hero-media-lqip" src={HERO_LQIP} alt="" aria-hidden="true" width="24" height="36" />}
          <picture className="hero-media-picture">
            <source media="(min-width: 601px)" srcSet={heroSrc} />
            <img
              className="hero-media-main"
              data-custom-hero={heroImage ? 'true' : undefined}
              src={heroSrc}
              alt={t('hero.alt')}
              width="768"
              height="1152"
              fetchpriority="high"
              decoding="async"
              onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
            />
          </picture>
        </div>
      </section>

      <div className="hero-free-shipping" dir="ltr" aria-label={t('hero.freeShippingBar')}>
        <div className="hero-free-shipping-track" aria-hidden="true">
          <span>{t('hero.freeShippingBar')}</span>
          <span>{t('hero.freeShippingBar')}</span>
        </div>
      </div>

      <section className="features container">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="feature">
            <Icon size={26} />
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </div>
        ))}
      </section>

      <Reveal as="section" className="section container">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t('home.browse')}</p>
            <h2>{t('home.shopByCategory')}</h2>
          </div>
        </div>
        <div className="cat-grid">
          {categories.map((c, index) => (
            <Link key={c.id} to={`/shop?category=${c.id}`} className="cat-tile" style={{ '--img': `url("${c.image || IMAGES.categories[c.id] || IMAGES.banner}")` }}>
              <span className="cat-tile-top">
                <span className="cat-tile-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span className="cat-tile-tag" aria-hidden="true">{t('home.collection')}</span>
              </span>
              <span className="cat-tile-footer">
                <span className="cat-tile-title">{getCategoryName(c, lang)}</span>
                <small className="cat-tile-action">
                  {t('home.explore')} <ArrowIcon size={14} />
                </small>
              </span>
            </Link>
          ))}
        </div>
      </Reveal>

      <ProductSection eyebrow={t('home.justLanded')} title={t('home.newArrivals')} products={newArrivals} moreTo="/shop" moreLabel={t('wishlist.discover')} />

      <Reveal as="section" className="offer" >
        <div className="offer-bg" style={{ '--img': `url(${JSON.stringify(offerImage || IMAGES.banner)})` }}>
          <div className="container offer-inner">
            {(offerCopy.eyebrow ?? t('home.specialOffer')) && (
              <p className="eyebrow light">{offerCopy.eyebrow ?? t('home.specialOffer')}</p>
            )}
            {offerTitle && <h2>{offerTitle}</h2>}
            {(offerCopy.description ?? t('home.offerText')) && (
              <p>{offerCopy.description ?? t('home.offerText')}</p>
            )}
            {(offerCopy.button ?? t('home.shopSale')) && (
              <Link to="/shop?sale=1" className="btn btn-light btn-lg">
                {offerCopy.button ?? t('home.shopSale')} <ArrowIcon size={18} />
              </Link>
            )}
          </div>
        </div>
      </Reveal>

      <ProductSection eyebrow={t('home.reduced')} title={t('home.onSaleNow')} products={onSale.slice(0, 6)} moreTo="/shop" moreLabel={t('wishlist.discover')} />

      <Reveal as="section" className="section container">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t('home.testimonials')}</p>
            <h2>{t('home.whatCustomersSay')}</h2>
          </div>
        </div>
        <div className="reviews" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {reviews.map((r) => (
            <figure key={r.name} className="review">
              <blockquote>“{r.text}”</blockquote>
              <figcaption>
                <strong>{r.name}</strong> · {r.city}
              </figcaption>
            </figure>
          ))}
        </div>
      </Reveal>
    </>
  );
}
