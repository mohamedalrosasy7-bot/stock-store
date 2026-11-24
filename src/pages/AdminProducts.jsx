import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useLang } from '../context/LangContext';
import { SEASONS, coverImage, getCategoryName, normalizeSeason, sortByNewest } from '../data/products';
import { money } from '../config';
import { EditIcon, TrashIcon, EyeIcon, EyeOffIcon, PlusIcon, SearchIcon } from '../components/Icons';

const SORT_OPTIONS = [
  { value: 'name-asc', labelKey: 'shop.nameAZ' },
  { value: 'name-desc', labelKey: 'admin.sortNameDesc' },
  { value: 'price-asc', labelKey: 'shop.priceLowHigh' },
  { value: 'price-desc', labelKey: 'shop.priceHighLow' },
  { value: 'newest', labelKey: 'shop.newest' },
];

export default function AdminProducts() {
  const { t, lang } = useLang();
  const { products, categories, deleteProduct, toggleProductActive, toggleSeasonVisibility, isSeasonHidden, status, statusMsg, clearStatus } = useAdmin();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [saleOnly, setSaleOnly] = useState(false);
  const [season, setSeason] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [confirmId, setConfirmId] = useState(null);

  const catLabel = (id) => {
    const cat = categories.find((c) => c.id === id);
    return cat ? getCategoryName(cat, lang) : id;
  };
  const seasonLabel = (id) => {
    const normalizedSeason = normalizeSeason(id);
    const season = SEASONS.find((s) => s.id === normalizedSeason);
    return season ? t(`season.${season.id}`, { defaultValue: season.label }) : normalizedSeason;
  };
  const firstImage = coverImage;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchQ = !q || p.name.toLowerCase().includes(q);
      const matchC = category === 'all' || p.category === category;
      const matchSale = !saleOnly || p.salePrice != null;
      const matchS = season === 'all' || normalizeSeason(p.season) === season;
      return matchQ && matchC && matchSale && matchS;
    });
    if (sortBy === 'newest') return sortByNewest(list);
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'price-asc': return (a.salePrice ?? a.price) - (b.salePrice ?? b.price);
        case 'price-desc': return (b.salePrice ?? b.price) - (a.salePrice ?? a.price);
        default: return a.name.localeCompare(b.name);
      }
    });
  }, [products, query, category, saleOnly, season, sortBy]);

  useEffect(() => {
    if (!status) return undefined;
    const t = setTimeout(clearStatus, 1500);
    return () => clearTimeout(t);
  }, [status, clearStatus]);

  const activeFilters = query.trim() !== '' || category !== 'all' || saleOnly || season !== 'all';
  const resetFilters = () => { setQuery(''); setCategory('all'); setSaleOnly(false); setSeason('all'); };
  const target = products.find((p) => p.id === confirmId);

  const handleDelete = () => {
    if (!confirmId) return;
    deleteProduct(confirmId);
    setConfirmId(null);
  };

  const priceOf = (p) => p.salePrice ?? p.price;
  const pctOf = (p) => (p.salePrice != null && p.price > 0
    ? Math.round((1 - p.salePrice / p.price) * 100)
    : 0);

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
          <h2>{t('admin.products')}</h2>
          <p className="admin-page-sub">
            {t('admin.shownCount', {
              shown: filtered.length,
              total: products.length,
              plural: products.length === 1 ? '' : 's',
            })}
          </p>
        </div>
        <Link to="/admin/products/add" className="btn btn-lg admin-btn-accent">
          <PlusIcon size={17} />
          <span>{t('admin.addProduct')}</span>
        </Link>
      </div>

      <section className="admin-season-panel" aria-labelledby="admin-season-title">
        <div className="admin-season-panel-head">
          <div>
            <h3 id="admin-season-title">{t('admin.seasonalVisibility')}</h3>
            <p>{t('admin.seasonalVisibilityHint')}</p>
          </div>
          <span className="admin-season-panel-badge">{t('admin.storeSettings')}</span>
        </div>
        <div className="admin-season-grid">
          {[
            { id: 'winter', labelKey: 'admin.winterProducts' },
            { id: 'summer', labelKey: 'admin.summerProducts' },
          ].map(({ id, labelKey }) => {
            const label = t(labelKey);
            const hidden = isSeasonHidden(id);
            const count = products.filter((product) => normalizeSeason(product.season) === id).length;
            return (
              <article key={id} className={`admin-season-card ${hidden ? 'is-hidden' : ''}`}>
                <div className="admin-season-copy">
                  <span className={`admin-season-indicator ${hidden ? 'is-hidden' : ''}`} aria-hidden="true" />
                  <div>
                    <h4>{label}</h4>
                    <p>
                      {hidden ? t('admin.currentlyHidden') : t('admin.currentlyVisible')}
                      {' · '}{t('admin.itemsCount', { count, plural: count === 1 ? '' : 's' })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className={`admin-season-action ${hidden ? 'is-hidden' : ''}`}
                  onClick={() => toggleSeasonVisibility(id)}
                  aria-pressed={!hidden}
                  aria-label={`${t(hidden ? 'admin.showAria' : 'admin.hideAria')} ${label}`}
                >
                  {hidden ? <EyeIcon size={17} /> : <EyeOffIcon size={17} />}
                  <span>{hidden ? t('admin.showInStore') : t('admin.hideFromStore')}</span>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <div className="admin-card admin-products-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <span className="admin-search-icon"><SearchIcon size={16} /></span>
            <input
              type="text"
              placeholder={t('admin.searchProductsPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t('admin.searchProductsAria')}
            />
          </div>
          <div className="admin-toolbar-filters">
            <select className="admin-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t('admin.filterByCategoryAria')}>
              <option value="all">{t('admin.allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{getCategoryName(c, lang)}</option>
              ))}
            </select>
            <select className="admin-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label={t('admin.sortProductsAria')}>
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
              ))}
            </select>
            <label className={"admin-check" + (saleOnly ? ' is-on' : '')}>
              <input type="checkbox" checked={saleOnly} onChange={(e) => setSaleOnly(e.target.checked)} />
              {t('admin.onSale')}
            </label>
            <select className="admin-select" value={season} onChange={(e) => setSeason(e.target.value)} aria-label={t('admin.filterBySeasonAria')}>
              <option value="all">{t('admin.allSeasons')}</option>
              {SEASONS.map((s) => (
                <option key={s.id} value={s.id}>{t(`season.${s.id}`, { defaultValue: s.label })}</option>
              ))}
            </select>

            {activeFilters && (
              <button type="button" className="admin-clear-filters" onClick={resetFilters}>{t('admin.clear')}</button>
            )}
          </div>
        </div>

        <div className="admin-table-wrap admin-desktop-only">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.thProduct')}</th>
                <th>{t('admin.thCategory')}</th>
                <th>{t('admin.thPrice')}</th>
                <th>{t('admin.thDiscount')}</th>
                <th>{t('admin.thStatus')}</th>
                <th className="admin-th-actions">{t('admin.thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const pct = pctOf(p);
                const isActive = p.active !== false;
                const isSoldOut = p.soldOut === true;
                return (
                  <tr key={p.id} className="admin-table-row">
                    <td>
                      <div className="admin-product-cell">
                        {firstImage(p)
                          ? <img src={firstImage(p)} alt={p.name} className="admin-table-img" />
                          : <div className="admin-table-img" aria-label={t('admin.noProductImage')} />}
                        <div className="admin-product-meta">
                          <span className="admin-table-name">{p.name}</span>
                          <span className="admin-colors-count">
                            {t('admin.colorsSizes', {
                              colors: (p.colors || []).length,
                              colorsPlural: (p.colors || []).length === 1 ? '' : 's',
                              sizes: (p.sizes || []).length,
                              sizesPlural: (p.sizes || []).length === 1 ? '' : 's',
                            })}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td><span className="admin-pill">{catLabel(p.category)}</span></td>
                    <td>
                      <div className="admin-price-cell">
                        <span className="admin-final-price">{money(priceOf(p))}</span>
                        {p.salePrice != null && <s className="admin-was">{money(p.price)}</s>}
                      </div>
                    </td>
                    <td>
                      {p.salePrice != null
                        ? <span className="admin-badge-discount">-{pct}%</span>
                        : <span className="admin-muted-dash">—</span>}
                    </td>
                    <td>
                      <span className={`admin-status ${isSoldOut ? 'hidden' : isActive ? 'active' : 'hidden'}`}>
                        <span className="admin-status-dot" />
                        {isSoldOut ? t('admin.soldOut') : isActive ? t('admin.statActive') : t('admin.statHidden')}
                      </span>
                    </td>
                    <td>
                      <div className="admin-cell-actions">
                        <Link to={`/admin/products/edit/${p.id}`} className="admin-icon-btn" title={t('admin.edit')} aria-label={t('admin.editProductAria', { name: p.name })}>
                          <EditIcon size={15} />
                        </Link>
                        <button
                          type="button"
                          className="admin-icon-btn"
                          onClick={() => toggleProductActive(p.id)}
                          title={isActive ? t('admin.hideFromStore') : t('admin.showInStore')}
                          aria-label={t(isActive ? 'admin.hideAria' : 'admin.showAria')}
                        >
                          {isActive ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn danger"
                          onClick={() => setConfirmId(p.id)}
                          title={t('admin.delete')}
                          aria-label={t('admin.deleteAriaNamed', { name: p.name })}
                        >
                          <TrashIcon size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="admin-mobile-cards admin-mobile-only">
          {filtered.map((p) => {
            const pct = pctOf(p);
            const isActive = p.active !== false;
            const isSoldOut = p.soldOut === true;
            return (
              <div key={p.id} className="admin-product-card">
                {firstImage(p)
                  ? <img src={firstImage(p)} alt={p.name} className="admin-product-card-img" />
                  : <div className="admin-product-card-img" aria-label={t('admin.noProductImage')} />}
                <div className="admin-product-card-body">
                  <div className="admin-product-card-top">
                    <span className="admin-product-card-name">{p.name}</span>
                    <span className={`admin-status ${isSoldOut ? 'hidden' : isActive ? 'active' : 'hidden'}`}>
                      <span className="admin-status-dot" />
                      {isSoldOut ? t('admin.soldOut') : isActive ? t('admin.statActive') : t('admin.statHidden')}
                    </span>
                  </div>
                  <div className="admin-product-card-tags">
                    <span className="admin-pill">{catLabel(p.category)}</span>
                    <span className="admin-pill admin-pill-season">{seasonLabel(p.season)}</span>
                    {p.salePrice != null && <span className="admin-badge-discount">-{pct}%</span>}
                  </div>
                  <div className="admin-product-card-price">
                    <strong>{money(priceOf(p))}</strong>
                    {p.salePrice != null && <s className="admin-was">{money(p.price)}</s>}
                  </div>
                  <div className="admin-product-card-actions">
                    <Link to={`/admin/products/edit/${p.id}`} className="btn btn-sm btn-outline">{t('admin.edit')}</Link>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => toggleProductActive(p.id)}>
                      {isActive ? t('admin.hideAria') : t('admin.showAria')}
                    </button>
                    <button type="button" className="btn btn-sm btn-outline danger" onClick={() => setConfirmId(p.id)}>{t('admin.delete')}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="admin-empty-state">
            <span className="admin-empty-icon">🔍</span>
            <h3>{t('admin.noProductsFound')}</h3>
            <p className="muted">
              {products.length === 0
                ? t('admin.emptyCatalog')
                : t('admin.noMatch')}
            </p>
            {products.length === 0
              ? <Link to="/admin/products/add" className="btn admin-btn-accent">+ {t('admin.addProduct')}</Link>
              : <button type="button" className="btn btn-outline" onClick={resetFilters}>{t('admin.clearFilters')}</button>}
          </div>
        )}
      </div>

      {target && (
        <div className="admin-modal-overlay" onClick={() => setConfirmId(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-icon admin-modal-icon-danger"><TrashIcon size={22} /></div>
            <h3>{t('admin.deleteProductTitle')}</h3>
            <p className="muted">
              {t('admin.deleteProductText', { name: target.name })}
            </p>
            <div className="admin-modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setConfirmId(null)}>{t('admin.cancel')}</button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>{t('admin.deleteProductBtn')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}