import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useLang } from '../context/LangContext';
import { SEASONS, getCategoryName, normalizeSeason, productImages } from '../data/products';
import { uploadStoreImage, isAllowedImage, purgeCloudinaryImages } from '../lib/images';
import { deleteImage } from '../lib/api';
import { money } from '../config';
import { CloseIcon, ArrowIcon } from '../components/Icons';

const DEFAULT_SIZES = {
  shoes: ['40', '41', '42', '43', '44', '45'],
  pants: ['S', 'M', 'L', 'XL', 'XXL'],
  hoodies: ['S', 'M', 'L', 'XL', 'XXL'],
  jackets: ['S', 'M', 'L', 'XL', 'XXL'],
  pullover: ['S', 'M', 'L', 'XL', 'XXL'],
};

export default function AdminProductForm() {
  const { t, lang } = useLang();
  const { products, categories, addProduct, updateProduct } = useAdmin();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const defaultCategory = categories[0]?.id || 'pants';

  const existing = isEdit ? products.find((p) => p.id === id) : null;
  const imageInput = useRef(null);
  const colorImageInputs = useRef({});

  const [form, setForm] = useState({
    name: '', description: '', category: defaultCategory, price: '', discount: '',
    colors: [{ name: 'Black', hex: '#141414', images: [] }],
    sizes: DEFAULT_SIZES[defaultCategory] || DEFAULT_SIZES.pants,
    images: [],
    active: true,
    soldOut: false,
    soldOutColors: [],
    soldOutSizes: [],
    season: 'both',
  });

  const [ready, setReady] = useState(!isEdit);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [customSize, setCustomSize] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    if (!existing) { setReady(true); return; }
    setForm({
      name: existing.name || '',
      description: existing.description || '',
      category: existing.category || 'pants',
      price: String(existing.price ?? ''),
      discount: existing.salePrice != null
        ? String(Math.round(((existing.price - existing.salePrice) / existing.price) * 100))
        : '',
      colors: (existing.colors || []).map((c) => ({ name: c.name, hex: c.hex, images: c.images || [] })),
      sizes: existing.sizes || [],
      images: existing.images || [],
      active: existing.active !== false,
      soldOut: existing.soldOut === true,
      soldOutColors: existing.soldOutColors || [],
      soldOutSizes: existing.soldOutSizes || [],
      season: normalizeSeason(existing.season),
    });
    setReady(true);
  }, [isEdit, existing]);

  const finalPrice = useMemo(() => {
    const price = parseFloat(form.price);
    const discount = parseFloat(form.discount) || 0;
    if (!price || price <= 0 || discount < 0 || discount > 100) return null;
    return Math.round(price * (1 - discount / 100) * 100) / 100;
  }, [form.price, form.discount]);

  const onSale = finalPrice != null && finalPrice < parseFloat(form.price || 0);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'admin.errNameRequired';
    if (!form.price || parseFloat(form.price) <= 0) e.price = 'admin.errPriceInvalid';
    if (form.discount !== '' && (parseFloat(form.discount) < 0 || parseFloat(form.discount) > 100)) e.discount = 'admin.errDiscountRange';
    if (!form.colors.length) e.colors = 'admin.errColorsRequired';
    else {
      // Same shade may appear twice, but each row needs its own distinct name.
      const names = form.colors.map((c) => c.name.trim().toLowerCase());
      if (names.some((n) => !n)) e.colors = 'admin.errColorNameRequired';
      else if (new Set(names).size !== names.length) e.colors = 'admin.errDuplicateColorName';
    }
    if (!form.sizes.length) e.sizes = 'admin.errSizesRequired';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (loading || !validate()) return;
    setLoading(true);
    setSaveError('');
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
    const payload = {
      id: isEdit ? existing.id : slug,
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      price: parseFloat(form.price),
      salePrice: onSale ? finalPrice : null,
      colors: form.colors.map((c) => ({ ...c, name: c.name.trim() })),
      sizes: form.sizes,
      images: form.images,
      active: form.active,
      soldOut: form.soldOut,
      soldOutColors: form.soldOutColors.map((n) => n.trim())
        .filter((n) => form.colors.some((c) => c.name.trim() === n)),
      soldOutSizes: form.soldOutSizes,
      season: form.season,
      isNew: isEdit ? existing.isNew : true,
      createdAt: isEdit ? existing.createdAt : Date.now(),
    };
    try {
      if (isEdit) await updateProduct(existing.id, payload);
      else await addProduct(payload);
      // Best-effort cleanup of images the admin removed while editing but that
      // are no longer referenced anywhere in the saved document.
      purgeCloudinaryImages(
        productImages(existing || {}).filter((src) => !productImages(payload).includes(src))
      ).catch(() => {});
      setSaved(true);
      setTimeout(() => navigate('/admin/products'), 900);
    } catch (error) {
      setSaveError(error?.message === 'Request timed out. Please check your connection and try again.'
        ? t('admin.productSaveTimedOut')
        : `${t('admin.productSaveFailed')}${error?.message ? ` (${error.message})` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  // Default name is unique ("New Color", "New Color 2", ...) so a fresh row
  // never clashes with an existing one — duplicate names are rejected on submit.
  const addColor = () => setForm((p) => {
    let name = 'New Color';
    for (let n = 2; p.colors.some((c) => c.name.trim().toLowerCase() === name.toLowerCase()); n++) name = `New Color ${n}`;
    return { ...p, colors: [...p.colors, { name, hex: '#d9c9ae', images: [] }] };
  });
  const removeColor = (i) => setForm((p) => {
    const removedName = p.colors[i]?.name;
    return {
      ...p,
      colors: p.colors.filter((_, idx) => idx !== i),
      soldOutColors: p.soldOutColors.filter((name) => name !== removedName),
    };
  });
  const updateColor = (i, field, value) => setForm((p) => ({ ...p, colors: p.colors.map((c, idx) => idx === i ? { ...c, [field]: value } : c) }));
  // Uploads through the Cloudinary pipeline (compressed + EXIF-oriented in
  // the browser, stored server-side); no base64 blobs in D1.
  const addColorImages = async (i, files) => {
    for (const file of Array.from(files || [])) {
      if (!isAllowedImage(file)) continue;
      try {
        const url = await uploadStoreImage(file);
        setForm((current) => ({
          ...current,
          colors: current.colors.map((color, idx) =>
            idx === i ? { ...color, images: [...(color.images || []), url] } : color
          ),
        }));
      } catch { /* upload already surfaced by the picker */ }
    }
  };
  const removeColorImage = (i, imageIndex) => {
    const src = (form.colors[i]?.images || [])[imageIndex];
    if (src) deleteImage(src).catch(() => {});
    setForm((p) => ({
      ...p,
      colors: p.colors.map((color, idx) =>
        idx === i
          ? { ...color, images: (color.images || []).filter((_, currentIndex) => currentIndex !== imageIndex) }
          : color
      ),
    }));
  };
  const toggleSize = (s) => setForm((p) => {
    const removing = p.sizes.includes(s);
    return {
      ...p,
      sizes: removing ? p.sizes.filter((x) => x !== s) : [...p.sizes, s],
      soldOutSizes: removing ? p.soldOutSizes.filter((x) => x !== s) : p.soldOutSizes,
    };
  });
  const toggleSoldOutColor = (name) => setForm((p) => ({
    ...p,
    soldOutColors: p.soldOutColors.includes(name)
      ? p.soldOutColors.filter((value) => value !== name)
      : [...p.soldOutColors, name],
  }));
  const toggleSoldOutSize = (size) => setForm((p) => ({
    ...p,
    soldOutSizes: p.soldOutSizes.includes(size)
      ? p.soldOutSizes.filter((value) => value !== size)
      : [...p.soldOutSizes, size],
  }));
  const addCustomSize = () => {
    const value = customSize.trim();
    if (!value) return;
    setForm((current) => {
      const exists = current.sizes.some((size) => size.toLowerCase() === value.toLowerCase());
      if (exists) return current;
      return { ...current, sizes: [...current.sizes, value] };
    });
    setCustomSize('');
  };

  const handleImages = async (ev) => {
    const files = Array.from(ev.target.files || []);
    for (const file of files) {
      if (!isAllowedImage(file)) continue;
      try {
        const url = await uploadStoreImage(file);
        setForm((p) => ({ ...p, images: [...p.images, url] }));
      } catch { /* keep the form usable when an upload fails */ }
    }
    ev.target.value = '';
  };

  const moveImage = (i, dir) => {
    setForm((p) => {
      const imgs = [...p.images];
      const j = i + dir;
      if (j < 0 || j >= imgs.length) return p;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...p, images: imgs };
    });
  };

  if (!ready) return <div className="admin-loading">{t('admin.loadingProduct')}</div>;
  if (isEdit && !existing) {
    return (
      <div className="admin-page">
        <div className="admin-card admin-empty"><p>{t('admin.productNotFound')}</p>
          <button className="btn" onClick={() => navigate('/admin/products')}>{t('admin.backToProducts')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {saved && <div className="admin-toast admin-toast--success">{t('admin.productSaved')}</div>}

      <div className="admin-page-head">
        <div>
          <h2>{isEdit ? t('admin.editProduct') : t('admin.addProduct')}</h2>
          <p className="muted small">{isEdit ? t('admin.updateDetails') : t('admin.createNewItem')}</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/admin/products')}>{t('admin.back')}</button>
      </div>

      <form className="admin-card admin-form" onSubmit={handleSubmit} noValidate>
        {saveError && <p className="admin-field-error" role="alert">{saveError}</p>}
        <div className="admin-form-grid">
          <div className="admin-field full">
            <label>{t('admin.productName')}</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t('admin.productNamePlaceholder')} />
            {errors.name && <span className="admin-field-error">{t(errors.name)}</span>}
          </div>

          <div className="admin-field full">
            <label>{t('admin.description')}</label>
            <textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={t('admin.descriptionPlaceholder')} />
          </div>

          <div className="admin-field">
            <label>{t('admin.categoryLabel')}</label>
            <select value={form.category} onChange={(e) => {
              const cat = e.target.value;
              setForm((p) => ({ ...p, category: cat, sizes: DEFAULT_SIZES[cat] || DEFAULT_SIZES.pants }));
            }}>
              {categories.map((c) => <option key={c.id} value={c.id}>{getCategoryName(c, lang)}</option>)}
            </select>
          </div>

          <div className="admin-field">
            <label>{t('admin.season')}</label>
            <select value={form.season} onChange={(e) => set('season', e.target.value)}>
              {SEASONS.map((s) => <option key={s.id} value={s.id}>{t(`season.${s.id}`, { defaultValue: s.label })}</option>)}
            </select>
            <span className="muted small">{t('admin.seasonHint')}</span>
          </div>

          <div className="admin-field">
            <label>{t('admin.status')}</label>
            <label className="admin-check">
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
              {t('admin.activeVisible')}
            </label>
          </div>

          <div className="admin-field full">
            <label>{t('admin.soldOut')}</label>
            <label className="admin-check admin-sold-out-check">
              <input type="checkbox" checked={form.soldOut} onChange={(e) => set('soldOut', e.target.checked)} />
              {t('admin.soldOutEntireProduct')}
            </label>
          </div>

          <div className="admin-field">
            <label>{t('admin.originalPrice')}</label>
            <input type="number" min="1" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="690" />
            {errors.price && <span className="admin-field-error">{t(errors.price)}</span>}
          </div>

          <div className="admin-field">
            <label>{t('admin.discountPercent')}</label>
            <input type="number" min="0" max="100" step="1" value={form.discount} onChange={(e) => set('discount', e.target.value)} placeholder="0" />
            {errors.discount && <span className="admin-field-error">{t(errors.discount)}</span>}
          </div>

          <div className="admin-field full">
            <div className="admin-price-preview">
              <div>
                <span className="muted small">{t('admin.finalPrice')}</span>
                <div className="admin-preview-price">{finalPrice != null ? money(finalPrice) : '—'}</div>
              </div>
              {onSale && (
                <div className="admin-preview-details">
                  <s>{money(parseFloat(form.price))}</s>
                  <span className="admin-pill admin-pill-sale">-{form.discount}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="admin-field full">
            <label>{t('admin.colors')}</label>
            {errors.colors && <span className="admin-field-error">{t(errors.colors)}</span>}
            <div className="admin-color-list">
              {form.colors.map((c, i) => (
                <div key={i} className="admin-color-block">
                  <div className="admin-color-row">
                    <input type="color" value={c.hex} onChange={(e) => updateColor(i, 'hex', e.target.value)} />
                    <input type="text" value={c.name} onChange={(e) => updateColor(i, 'name', e.target.value)} placeholder={t('admin.colorName')} />
                    <label className="admin-sold-out-option" title={t('admin.soldOutColor')}>
                      <input type="checkbox" checked={form.soldOutColors.includes(c.name)} onChange={() => toggleSoldOutColor(c.name)} />
                      <span>{t('admin.soldOutShort')}</span>
                    </label>
                    <button type="button" className="admin-icon-btn" onClick={() => removeColor(i)} aria-label={t('admin.removeColor')}><CloseIcon size={14} /></button>
                  </div>
                  <div className="admin-color-images">
                    {(c.images || []).map((src, imageIndex) => (
                      <div key={`${src.slice(0, 30)}-${imageIndex}`} className="admin-color-image">
                        <img src={src} alt={`${c.name} ${imageIndex + 1}`} />
                        <button type="button" onClick={() => removeColorImage(i, imageIndex)} aria-label={t('admin.removeImage')}>
                          <CloseIcon size={12} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="admin-color-image-add" onClick={() => colorImageInputs.current[i]?.click()}>
                      <span>+</span>
                      <small>{t('admin.addColorImages')}</small>
                    </button>
                    <input
                      ref={(el) => { colorImageInputs.current[i] = el; }}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => { addColorImages(i, e.target.files); e.target.value = ''; }}
                      hidden
                    />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={addColor}>{t('admin.addColor')}</button>
          </div>

          <div className="admin-field full">
            <label>{t('admin.sizes')}</label>
            {errors.sizes && <span className="admin-field-error">{t(errors.sizes)}</span>}
            <div className="admin-sizes-box">
              <div className="admin-sizes-box-head">
                <strong>{t('admin.availableSizes')}</strong>
                <span className="muted small">{t('admin.soldOutSizesHint')}</span>
              </div>
              <div className="admin-stock-size-list">
                {form.sizes.map((size) => (
                  <label key={size} className={`admin-stock-size-row ${form.soldOutSizes.includes(size) ? 'is-sold-out' : ''}`}>
                    <strong>{size}</strong>
                    <span>{t('admin.soldOutShort')}</span>
                    <input
                      type="checkbox"
                      checked={form.soldOutSizes.includes(size)}
                      onChange={() => toggleSoldOutSize(size)}
                    />
                    <button type="button" className="admin-stock-size-remove" onClick={(event) => { event.preventDefault(); toggleSize(size); }} aria-label={`${t('admin.remove')} ${size}`}>×</button>
                  </label>
                ))}
              </div>
            </div>
            <div className="admin-custom-size">
              <input
                type="text"
                id="customSize"
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                placeholder={t('admin.customSize')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomSize();
                  }
                }}
              />
              <button type="button" className="admin-add-size-btn" onClick={addCustomSize}>
                <span className="admin-add-size-plus" aria-hidden="true" />
                {t('admin.addSize')}
              </button>
            </div>
          </div>

          <div className="admin-field full">
            <label>{t('admin.images')}</label>
            <div className="admin-image-grid">
              {form.images.map((src, i) => (
                <div key={i} className="admin-image-item">
                  <img src={src} alt={t('admin.imageAlt', { index: i + 1 })} />
                  <div className="admin-image-tools">
                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label={t('admin.moveLeft')}><ArrowIcon size={14} style={{ transform: 'rotate(180deg)' }} /></button>
                    <span>{i + 1}</span>
                    <button type="button" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} aria-label={t('admin.moveRight')}><ArrowIcon size={14} /></button>
                    <button type="button" className="danger" onClick={() => { const src = form.images[i]; if (src) deleteImage(src).catch(() => {}); set('images', form.images.filter((_, idx) => idx !== i)); }} aria-label={t('admin.removeImage')}><CloseIcon size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <input ref={imageInput} type="file" accept="image/*" multiple onChange={handleImages} style={{ display: 'none' }} />
            <button type="button" className="btn btn-outline btn-sm" onClick={() => imageInput.current?.click()}>{t('admin.addImages')}</button>
          </div>
        </div>

        <div className="admin-form-actions">
          <button type="button" className="btn btn-outline btn-lg" onClick={() => navigate('/admin/products')}>{t('admin.cancel')}</button>
          <button type="submit" className="btn btn-lg" disabled={loading}>
            {loading ? t('admin.saving') : isEdit ? t('admin.saveChanges') : t('admin.createProduct')}
          </button>
        </div>
      </form>
    </div>
  );
}