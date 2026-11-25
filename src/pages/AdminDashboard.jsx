import { useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useLang } from '../context/LangContext';
import { Link } from 'react-router-dom';
import { money } from '../config';
import { coverImage, getCategoryName, sortByNewest } from '../data/products';
import { EditIcon, PackageIcon, TagIcon, UsersIcon, ClockIcon } from '../components/Icons';

const STAT_CARDS = [
  { labelKey: 'admin.statTotalProducts', icon: <PackageIcon size={20} />, color: 'var(--accent)' },
  { labelKey: 'admin.statActive', icon: <UsersIcon size={20} />, color: 'var(--success)' },
  { labelKey: 'admin.statHidden', icon: <ClockIcon size={20} />, color: 'var(--muted)' },
  { labelKey: 'admin.statOnSale', icon: <TagIcon size={20} />, color: 'var(--danger)' },
];

export default function AdminDashboard() {
  const { t, lang } = useLang();
  const { products, categories, status, statusMsg, clearStatus } = useAdmin();

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