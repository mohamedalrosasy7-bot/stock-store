import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { discountPercent, getCategoryName, getProductDetails } from '../data/products';
import { useAdmin } from '../context/AdminContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LangContext';
import { useSEO } from '../hooks/useSEO';
import ProductImage from '../components/ProductImage';
import ProductCard from '../components/ProductCard';
import Price from '../components/Price';
import QtySelect from '../components/QtySelect';
import { BagIcon, CashIcon, HeartIcon, ReturnIcon, TrashIcon, TruckIcon } from '../components/Icons';
import NotFound from './NotFound';
import { getColorAvailability, isVariantAvailable } from '../data/variantAvailability';
import { cloudinaryUrl } from '../config';

export default function ProductDetails() {
  const { id } = useParams();
  const { products, categories, isSeasonHidden } = useAdmin();
  const product = products.find((p) => p.id === id);
  if (!product || product.active === false || isSeasonHidden(product.season)) return <NotFound />;
  return <Details key={product.id} product={product} categories={categories} />;
}

function Details({ product, categories }) {
  const { t, lang } = useLang();
  const { products, isSeasonHidden } = useAdmin();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const toast = useToast();
  const [img, setImg] = useState(0);
  const touchStartX = useRef(null);
  // Arriving from a card's "Add to cart" button (#pick): scroll straight to
  // the color/size chooser and flash it so the shopper knows to pick variants.
  useEffect(() => {
    if (!window.location.hash.includes('pick')) return undefined;
    const timer = setTimeout(() => {
      document.getElementById('pick')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const el = document.getElementById('pick');
      if (el) {
        el.classList.add('pick-flash');
        setTimeout(() => el.classList.remove('pick-flash'), 1600);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, []);
  const colors = Array.isArray(product.colors) ? product.colors : [];
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const soldOutWhole = product.soldOut === true;
  const firstAvailableColor = colors.find((color) =>
    getColorAvailability(product, color.name).availableSizes.length > 0
  );
  const initialColor = firstAvailableColor || colors[0];
  const initialColorSizes = initialColor
    ? getColorAvailability(product, initialColor.name).availableSizes
    : [];
  const [variants, setVariants] = useState([{
    id: 0,
    color: initialColor?.name || '',
    size: initialColorSizes.length === 1 ? initialColorSizes[0] : null,
    qty: 1,
  }]);
  const [activeVariantId, setActiveVariantId] = useState(0);
  const [variantErrors, setVariantErrors] = useState([]);
  const nextVariantId = useRef(1);
  const selectedVariant = variants.find((variant) => variant.id === activeVariantId) || variants[0];
  const selectedColor = colors.find((color) => color.name === selectedVariant?.color);
  const selectedColorHasImages = Array.isArray(selectedColor?.images) && selectedColor.images.some(Boolean);
  const selectedColorAvailability = getColorAvailability(product, selectedVariant?.color);
  const selectedColorSoldOut = !!selectedColor && selectedColorAvailability.soldOut;
  const allColorImages = colors.flatMap((color) =>
    Array.isArray(color.images) ? color.images.filter(Boolean) : []
  );
  const activeImages = [...new Set([...images, ...allColorImages])];

  useSEO(product.name, product.description);

  const updateVariantColor = (variantId, colorName) => {
    const currentVariant = variants.find((variant) => variant.id === variantId);
    const availability = getColorAvailability(product, colorName);
    const size = availability.availableSizes.includes(currentVariant?.size)
      ? currentVariant.size
      : availability.availableSizes.length === 1
        ? availability.availableSizes[0]
        : null;
    setVariants((current) => current.map((variant) =>
      variant.id === variantId ? { ...variant, color: colorName, size } : variant
    ));
  };

  const selectImage = (index) => {
    setImg(index);
    const matchingColor = colors.find((color) =>
      Array.isArray(color.images) && color.images.includes(activeImages[index])
    );
    if (matchingColor && selectedVariant) {
      updateVariantColor(activeVariantId, matchingColor.name);
    }
  };
  const stepImage = (step) => {
    if (!activeImages.length) return;
    selectImage((img + step + activeImages.length) % activeImages.length);
  };
  const handleGalleryTouchStart = (event) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };
  const handleGalleryTouchEnd = (event) => {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) >= 40) stepImage(distance < 0 ? 1 : -1);
  };

  const pct = discountPercent(product);
  const details = getProductDetails(product);
  const wished = has(product.id);
  const category = categories.find((item) => item.id === product.category);
  const catLabel = category ? getCategoryName(category, lang) : '';
  const related = products.filter((p) =>
    p.active !== false &&
    !isSeasonHidden(p.season) &&
    p.category === product.category &&
    p.id !== product.id
  ).slice(0, 4);

  const updateVariant = (id, field, value) => {
    setActiveVariantId(id);
    if (field === 'color') {
      updateVariantColor(id, value);
      const colorImages = colors.find((color) => color.name === value)?.images || [];
      const firstColorImage = activeImages.findIndex((src) => colorImages.includes(src));
      setImg(firstColorImage >= 0 ? firstColorImage : 0);
    } else {
      setVariants((current) => current.map((variant) =>
        variant.id === id ? { ...variant, [field]: value } : variant
      ));
    }
    const variant = variants.find((item) => item.id === id);
    const otherChoice = field === 'color' ? variant?.size : variant?.color;
    if ((field === 'color' || field === 'size') && value && otherChoice) {
      setVariantErrors((current) => current.filter((variantId) => variantId !== id));
    }
  };

  const addVariant = () => {
    const id = nextVariantId.current++;
    const colorName = firstAvailableColor?.name || '';
    const availableSizes = colorName
      ? getColorAvailability(product, colorName).availableSizes
      : [];
    setVariants((current) => [...current, {
      id,
      color: colorName,
      size: availableSizes.length === 1 ? availableSizes[0] : null,
      qty: 1,
    }]);
    setActiveVariantId(id);
  };

  const removeVariant = (id) => {
    setVariants((current) => {
      const remaining = current.filter((variant) => variant.id !== id);
      if (activeVariantId === id) setActiveVariantId(remaining[0]?.id ?? 0);
      return remaining;
    });
    setVariantErrors((current) => current.filter((variantId) => variantId !== id));
  };

  const addVariantsToCart = () => {
    const invalidVariants = variants.filter((variant) =>
      !variant.color ||
      !variant.size ||
      !isVariantAvailable(product, variant.color, variant.size)
    );
    if (invalidVariants.length) {
      setVariantErrors(invalidVariants.map((variant) => variant.id));
      toast('product.chooseColorSize', 'error');
      return false;
    }

    variants.forEach(({ color, size, qty }) => addItem(product, { size, color, qty }));
    return true;
  };

  const add = () => {
    if (!addVariantsToCart()) return;
    toast('product.addedToCart', 'success', { name: product.name });
    navigate('/cart');
  };

  const buyNow = () => {
    if (!addVariantsToCart()) return;
    navigate('/checkout');
  };

  const hasSoldOutVariant = variants.some((variant) =>
    variant.color && getColorAvailability(product, variant.color).soldOut
  );

  if (!colors.length || !sizes.length) {
    return <div className="container pdp"><p>{t('product.incomplete')}</p></div>;
  }

  return (
    <div className="container pdp">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">{t('product.home')}</Link> / <Link to="/shop">{t('product.shop')}</Link> / <Link to={`/shop?category=${product.category}`}>{catLabel}</Link> /{' '}
        <span>{product.name}</span>
      </nav>

      <div className="pdp-grid">
        <div className="gallery">
          <div className="thumbs">
            {activeImages.map((src, i) => (
              (() => {
                const imageColor = colors.find((color) =>
                  Array.isArray(color.images) && color.images.includes(src)
                );
                const imageColorSoldOut = imageColor
                  ? getColorAvailability(product, imageColor.name).soldOut
                  : false;
                const thumbSoldOut = soldOutWhole || imageColorSoldOut;
                const matchesSelectedColor = !!selectedVariant?.color && (
                  imageColor
                    ? imageColor.name === selectedVariant.color
                    : !selectedColorHasImages
                );
                return (
              <button
                key={src}
                className={`thumb ${i === img ? 'active' : ''} ${matchesSelectedColor ? 'matches-selected-color' : ''}`}
                onClick={() => selectImage(i)}
                aria-label={t('product.viewImage', { index: i + 1 })}
              >
                <ProductImage src={cloudinaryUrl(src, { width: 180 })} alt={`${product.name} view ${i + 1}`} />
                {thumbSoldOut && <span className="badge badge-sold-out">{t('admin.soldOut')}</span>}
              </button>
                );
              })()
            ))}
          </div>
          <div
            className="gallery-main"
            onTouchStart={handleGalleryTouchStart}
            onTouchEnd={handleGalleryTouchEnd}
            onTouchCancel={() => { touchStartX.current = null; }}
          >
            {activeImages.length ? (
              <ProductImage src={cloudinaryUrl(activeImages[img % activeImages.length], { width: 900 })} alt={`${product.name} - ${selectedVariant?.color || ''}`} loading="eager" />
            ) : (
              <ProductImage src="" alt={product.name} loading="eager" />
            )}
            {activeImages.length > 1 && (
              <span className="gallery-count" aria-live="polite" dir="ltr">
                {img + 1} / {activeImages.length}
              </span>
            )}
            <div className="badges">
              {pct > 0 && <span className="badge badge-sale">-{pct}%</span>}
              {(soldOutWhole || selectedColorSoldOut) && <span className="badge badge-sold-out">{t('admin.soldOut')}</span>}
            </div>
          </div>
        </div>

        <div className="pdp-info">
          <p className="eyebrow">{catLabel}</p>
          <h1>{product.name}</h1>
          <Price product={product} large />
          {product.description?.trim() && (
            <p className="pdp-desc">{product.description}</p>
          )}

          <div className="variant-list" id="pick">
            {variants.map((variant, index) => {
              const hasError = variantErrors.includes(variant.id);
              const availability = getColorAvailability(product, variant.color);
              return (
                <section
                  key={variant.id}
                  className={`variant-row ${activeVariantId === variant.id ? 'active' : ''}`}
                  aria-label={t('product.item', { index: index + 1 })}
                  onClick={(event) => {
                    if (!event.target.closest('button,input')) setActiveVariantId(variant.id);
                  }}
                >
                  <div className="variant-row-head">
                    <div className="variant-item-title">
                      <span className="variant-item-number">{String(index + 1).padStart(2, '0')}</span>
                      <strong>{t('product.item', { index: index + 1 })}</strong>
                    </div>
                    {variants.length > 1 && (
                      <button type="button" className="variant-remove" onClick={() => removeVariant(variant.id)}>
                        <TrashIcon size={15} /> {t('product.remove')}
                      </button>
                    )}
                  </div>
                  <div className="option">
                    <div className="option-label">
                      {t('product.color')} <strong>{variant.color || t('product.selectColor')}</strong>
                    </div>
                    <div
                      className={`swatches big variant-swatches ${hasError && !variant.color ? 'error' : ''}`}
                      role="radiogroup"
                      aria-label={t('product.color')}
                    >
                      {colors.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          role="radio"
                          aria-checked={variant.color === c.name}
                          aria-label={c.name}
                          title={c.name}
                          className={`swatch ${!getColorAvailability(product, c.name).soldOut ? 'available' : ''} ${variant.color === c.name ? 'active' : ''} ${getColorAvailability(product, c.name).soldOut ? 'sold-out' : ''}`}
                          style={{ '--c': c.hex }}
                          onClick={() => updateVariant(variant.id, 'color', c.name)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="option">
                    <div className="option-label">
                      {t('product.size')} <strong>{variant.size || t('product.selectSize')}</strong>
                    </div>
                    <div className={`sizes big ${hasError && !variant.size ? 'error' : ''}`} role="radiogroup" aria-label={t('product.size')}>
                      {availability.sizes.map((sizeOption) => (
                        <button
                          key={sizeOption}
                          type="button"
                          role="radio"
                          aria-checked={variant.size === sizeOption}
                          className={`size ${!availability.soldOut && !availability.soldOutSizes.includes(sizeOption) ? 'available' : ''} ${variant.size === sizeOption ? 'active' : ''} ${availability.soldOut || availability.soldOutSizes.includes(sizeOption) ? 'sold-out' : ''}`}
                          disabled={availability.soldOut || availability.soldOutSizes.includes(sizeOption)}
                          onClick={() => updateVariant(variant.id, 'size', sizeOption)}
                        >
                          {sizeOption}
                        </button>
                      ))}
                    </div>
                    {!!variant.color && !availability.sizes.length && (
                      <p className="muted small">{t('product.noSizesForColor')}</p>
                    )}
                    {hasError && <p className="form-msg error">{t('product.chooseColorSize')}</p>}
                  </div>
                  <div className="option variant-quantity">
                    <div className="option-label">{t('product.quantity')}</div>
                    <QtySelect
                      value={variant.qty}
                      onChange={(qty) => updateVariant(variant.id, 'qty', qty)}
                    />
                  </div>
                </section>
              );
            })}
          </div>
          <button type="button" className="btn btn-outline btn-sm variant-add" onClick={addVariant}>
            {t('product.addAnother')}
          </button>

          <div className="pdp-actions">
            <button className="btn btn-lg btn-discover" onClick={add} disabled={soldOutWhole || hasSoldOutVariant}>
              <BagIcon size={18} /> {t('product.addToCart')}
            </button>
            <button className="btn btn-outline btn-lg btn-buy" onClick={buyNow} disabled={soldOutWhole || hasSoldOutVariant}>
              {t('product.buyNow')}
            </button>
            <button
              className={`btn btn-outline btn-lg icon-only wish-btn ${wished ? 'on' : ''}`}
              onClick={() => {
                toggle(product.id);
                toast(wished ? 'product.removedWishlist' : 'product.savedWishlist', wished ? 'wishlist-remove' : 'wishlist');
              }}
              aria-pressed={wished}
              aria-label={wished ? t('product.removeWishlist') : t('product.addWishlist')}
            >
              <HeartIcon filled={wished} />
            </button>
          </div>

          <ul className="pdp-perks">
            <li><TruckIcon size={18} /> {t('product.freeDeliveryOver')}</li>
            <li><CashIcon size={18} /> {t('product.codAvailable')}</li>
            <li><ReturnIcon size={18} /> {t('product.returns')}</li>
          </ul>

          <div className="pdp-details">
            <h3>{t('product.details')}</h3>
            <ul>
              {details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>{t('product.youMayAlsoLike')}</h2>
          </div>
          <div className="grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
