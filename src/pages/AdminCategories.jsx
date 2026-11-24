import { useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useLang } from '../context/LangContext';
import { IMAGES, getCategoryName } from '../data/products';
import { isAllowedImage, uploadStoreImage } from '../lib/images';
import { ImageIcon, PlusIcon, TrashIcon } from '../components/Icons';

const EMPTY_CATEGORY = { label: '', labelAr: '', image: '' };
const MAX_IMAGE_SIZE = 1024 * 1024;

const createCategoryId = (label, categories) => {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!base) return '';
  let id = base;
  let suffix = 2;
  while (categories.some((category) => category.id === id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
};

export default function AdminCategories() {
  const { t, lang } = useLang();
  const {
    categories,
    products,
    addCategory,
    updateCategory,
    deleteCategory,
    status,
    statusMsg,
    clearStatus,
  } = useAdmin();
  const [newCategory, setNewCategory] = useState(EMPTY_CATEGORY);
  const [drafts, setDrafts] = useState({});
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (!status) return undefined;
    const timer = setTimeout(clearStatus, 1500);
    return () => clearTimeout(timer);
  }, [status, clearStatus]);

  const setDraft = (id, field, value) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] || categories.find((category) => category.id === id)), [field]: value },
    }));
  };

  const readImage = async (event, onRead) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setUploadError('');
    if (!file) return;
    if (!isAllowedImage(file)) {
      setUploadError('admin.onlyImages');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setUploadError('admin.categoryImageTooLarge');
      return;
    }

    try {
      onRead(await uploadStoreImage(file));
    } catch {
      setUploadError('admin.imageUploadFailed');
    }
  };

  const saveNewCategory = (event) => {
    event.preventDefault();
    setUploadError('');
    if (!newCategory.label.trim() || !newCategory.labelAr.trim()) return;
    const id = createCategoryId(newCategory.label, categories);
    if (!id) {
      setUploadError('admin.categoryEnglishIdError');
      return;
    }
    if (addCategory({ ...newCategory, id })) setNewCategory(EMPTY_CATEGORY);
  };

  const saveCategory = (category) => {
    const draft = drafts[category.id] || category;
    if (updateCategory(category.id, draft)) {
      setDrafts((current) => {
        const next = { ...current };
        delete next[category.id];
        return next;
      });
    }
  };

  const removeCategory = (category) => {
    const name = getCategoryName(category, lang);
    if (window.confirm(t('admin.categoryDeleteConfirm', { name }))) {
      deleteCategory(category.id);
    }
  };

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
          <span className="admin-category-eyebrow">{t('admin.categoryWorkspace')}</span>
          <h2>{t('admin.categories')}</h2>
          <p className="admin-page-sub">{t('admin.manageCategoriesHint')}</p>
        </div>
        <span className="admin-category-count">{t('admin.categoryCount', { count: categories.length })}</span>
      </div>

      <form className="admin-card admin-category-create" onSubmit={saveNewCategory}>
        <div className="admin-category-create-heading">
          <span className="admin-category-create-icon"><PlusIcon size={18} /></span>
          <div>
            <h2>{t('admin.addCategory')}</h2>
            <p className="admin-subtitle">{t('admin.categoryIdHint')}</p>
          </div>
        </div>
        <div className="admin-category-create-fields">
          <label className="admin-field">
            <span>{t('admin.categoryNameEn')}</span>
            <input
              value={newCategory.label}
              onChange={(event) => setNewCategory((current) => ({ ...current, label: event.target.value }))}
              placeholder={t('admin.categoryNameEnPlaceholder')}
              required
            />
          </label>
          <label className="admin-field">
            <span>{t('admin.categoryNameAr')}</span>
            <input
              value={newCategory.labelAr}
              onChange={(event) => setNewCategory((current) => ({ ...current, labelAr: event.target.value }))}
              placeholder={t('admin.categoryNameArPlaceholder')}
              required
            />
          </label>
          <label className="admin-category-upload">
            {newCategory.image
              ? <img className="admin-category-upload-preview" src={newCategory.image} alt="" />
              : <ImageIcon size={19} />}
            <span>{t('admin.categoryImageOptional')}</span>
            <input
              className="admin-category-file-input"
              type="file"
              accept="image/*"
              onChange={(event) => readImage(event, (image) => setNewCategory((current) => ({ ...current, image })))}
            />
          </label>
        </div>
        {uploadError && <p className="admin-field-error" role="alert">{t(uploadError)}</p>}
        <button type="submit" className="btn btn-lg admin-btn-accent" disabled={!newCategory.label.trim() || !newCategory.labelAr.trim()}>
          <PlusIcon size={17} /> {t('admin.addCategory')}
        </button>
      </form>

      <div className="admin-category-list">
        {categories.map((category) => {
          const draft = drafts[category.id] || category;
          const productCount = products.filter((product) => product.category === category.id).length;
          const canDelete = productCount === 0 && categories.length > 1;
          const image = draft.image || category.image || IMAGES.categories[category.id] || IMAGES.banner;
          const hasChanges = draft.label !== category.label || draft.labelAr !== category.labelAr || draft.image !== category.image;
          return (
            <article key={category.id} className="admin-card admin-category-card">
              <div className="admin-category-visual">
                <img className="admin-category-preview" src={image} alt={getCategoryName(category, lang)} />
              </div>
              <div className="admin-category-fields">
                <div className="admin-category-meta">
                  <div className="admin-category-meta-copy">
                    <strong>{getCategoryName(category, lang)}</strong>
                    <span>{category.id}</span>
                  </div>
                  <span className="admin-category-product-count">{t('admin.categoryProductCount', { count: productCount })}</span>
                </div>
                <label className="admin-field">
                  <span>{t('admin.categoryNameEn')}</span>
                  <input value={draft.label} onChange={(event) => setDraft(category.id, 'label', event.target.value)} />
                </label>
                <label className="admin-field">
                  <span>{t('admin.categoryNameAr')}</span>
                  <input value={draft.labelAr} onChange={(event) => setDraft(category.id, 'labelAr', event.target.value)} />
                </label>
                <label className="admin-category-upload admin-category-upload--compact">
                  <ImageIcon size={17} />
                  <span>{t('admin.categoryImage')}</span>
                  <input
                    className="admin-category-file-input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => readImage(event, (nextImage) => setDraft(category.id, 'image', nextImage))}
                  />
                </label>
                <div className="admin-category-actions">
                  <button type="button" className="btn admin-category-save" onClick={() => saveCategory(category)} disabled={!hasChanges}>
                    {t('admin.saveCategory')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline admin-category-delete"
                    onClick={() => removeCategory(category)}
                    disabled={!canDelete}
                    title={!canDelete ? t(productCount ? 'admin.categoryInUse' : 'admin.categoryKeepOne') : undefined}
                  >
                    <TrashIcon size={16} /> {t('admin.delete')}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
