import { useMemo, useEffect, useState } from 'react';
import { useLang } from '../context/LangContext';
import { useOrders } from '../context/OrdersContext';
import { cloudinarySrcSet, cloudinaryUrl, STORE, money } from '../config';
import { ClockIcon, PackageIcon, SearchIcon, TrashIcon, TruckIcon, WhatsAppIcon } from '../components/Icons';

const STATUS_CLASS = { new: 'new', shipped: 'shipped', delivered: 'delivered' };

export const buildWhatsAppLink = (order, t) => {
  const lines = order.items.map((i) => t('order.line', { qty: i.qty, name: i.name, size: i.size, color: i.color, total: money(i.total) })).join('\n');
  const message = [
    t('order.hello', { store: STORE.name, id: order.number || order.id }),
    lines,
    `${t('order.subtotal')}: ${money(order.subtotal)}`,
    `${t('order.shipping')}: ${order.shipping === 0 ? t('order.free') : money(order.shipping)}`,
    `${t('order.total')}: ${money(order.total)}`,
    `${t('order.waName')}: ${order.customer.fullName}`,
    `${t('order.waPhone')}: ${order.customer.phone}`,
    `${t('order.waAddress')}: ${order.customer.address}, ${order.customer.city}`,
  ].filter(Boolean).join('\n');
  const phone = (order.customer.phone || '').replace(/[^\d]/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export default function AdminOrders() {
  const { t, lang } = useLang();
  const { orders, removeOrder, updateOrderStatus, refresh } = useOrders();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // Full-size image preview (lightbox) — opened by clicking an item thumbnail.
  const [preview, setPreview] = useState(null);

  // Close the lightbox on Escape / body scroll lock while it is open.
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!preview) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setPreview(null); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [preview]);

  // Color name of an order line, translated when it is a known color name.
  const colorLabel = (i) => i.color || '';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && (o.status || 'new') !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        `#${o.number || o.id}`,
        o.number ? String(o.number) : o.id,
        o.customer.fullName, o.customer.phone, o.customer.city, o.customer.address,
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [orders, query, statusFilter]);

  const revenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const newCount = orders.filter((o) => (o.status || 'new') === 'new').length;
  const shippedCount = orders.filter((o) => o.status === 'shipped').length;

  const stats = [
    { label: t('admin.ordersStatTotal'), value: orders.length, icon: <PackageIcon size={20} />, color: 'var(--accent)' },
    { label: t('admin.ordersStatNew'), value: newCount, icon: <ClockIcon size={20} />, color: 'var(--muted)' },
    { label: t('admin.ordersStatShipped'), value: shippedCount, icon: <TruckIcon size={20} />, color: 'var(--success)' },
    { label: t('admin.ordersStatRevenue'), value: money(revenue), icon: null, color: 'var(--danger)' },
  ];

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · ' + new Date(iso).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-EG', { hour: '2-digit', minute: '2-digit' });

  const statusLabel = (s) => (s === 'shipped' ? t('admin.orderShipped') : s === 'delivered' ? t('admin.orderDelivered') : t('admin.orderNew'));

  const confirmDelete = (order) => {
    if (window.confirm(t('admin.orderDeleteConfirm', { id: order.number || order.id }))) {
      removeOrder(order.id);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h2>{t('admin.orders')}</h2>
          <p className="admin-subtitle">{t('admin.ordersSubtitle')}</p>
        </div>
      </div>

      <div className="admin-stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="admin-stat">
            <div className="admin-stat-icon" style={{ color: s.color, background: `${s.color}15` }}>
              {s.icon || <span className="admin-stat-egp">EGP</span>}
            </div>
            <div className="admin-stat-info">
              <p className="admin-stat-label">{s.label}</p>
              <p className="admin-stat-value">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-card admin-products-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <span className="admin-search-icon"><SearchIcon size={16} /></span>
            <input
              type="text"
              placeholder={t('admin.searchOrdersPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t('admin.searchOrdersAria')}
            />
          </div>
          <div className="admin-toolbar-filters">
            <select className="admin-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label={t('admin.filterByStatusAria')}>
              <option value="all">{t('admin.allStatuses')}</option>
              <option value="new">{t('admin.orderNew')}</option>
              <option value="shipped">{t('admin.orderShipped')}</option>
              <option value="delivered">{t('admin.orderDelivered')}</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="admin-empty">
            <p className="muted">{orders.length === 0 ? t('admin.noOrdersYet') : t('admin.noOrdersMatch')}</p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap admin-desktop-only">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.thOrder')}</th>
                    <th>{t('admin.thCustomer')}</th>
                    <th>{t('admin.thItems')}</th>
                    <th>{t('admin.thTotal')}</th>
                    <th>{t('admin.thPayment')}</th>
                    <th>{t('admin.thDate')}</th>
                    <th>{t('admin.thStatus')}</th>
                    <th className="admin-th-actions">{t('admin.thActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={o.id} className="admin-table-row">
                      <td><span className="admin-order-no">#{o.number || o.id}</span></td>
                      <td>
                        <div className="admin-product-meta">
                          <span className="admin-table-name">{o.customer.fullName}</span>
                          <span className="admin-muted-dash">{o.customer.phone}</span>
                          <span className="admin-muted-dash">{o.customer.city}</span>
                        </div>
                      </td>
                      <td>
                        <div className="admin-order-items">
                          {o.items.map((i, idx) => (
                            <span key={idx} className="admin-order-item">
                              {i.image ? (
                                <button
                                  type="button"
                                  className="admin-order-item-img-btn"
                                  onClick={() => setPreview({ src: i.image, alt: i.name })}
                                  aria-label={t('admin.viewImage')}
                                  title={t('admin.viewImage')}
                                >
                                  <img className="admin-order-item-img" src={cloudinaryUrl(i.image, { width: 240 })} srcSet={cloudinarySrcSet(i.image, [120, 240])} sizes="60px" alt={i.name} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                </button>
                              ) : null}
                              {i.qty}× {i.name}
                              {i.size && i.size !== 'One Size' ? ` (${i.size})` : ''}
                              {colorLabel(i) ? ` — ${colorLabel(i)}` : ''}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td><span className="admin-order-total">{money(o.total)}</span></td>
                      <td><span className="admin-pill">{t(`checkout.${o.payment}`, { defaultValue: o.payment })}</span></td>
                      <td><span className="admin-muted-dash">{fmtDate(o.date)}</span></td>
                      <td>
                        <span className={`admin-status ${STATUS_CLASS[o.status || 'new']}`}>
                          <span className="admin-status-dot" />
                          {statusLabel(o.status)}
                        </span>
                      </td>
                      <td>
                        <div className="admin-cell-actions">
                          <select
                            className="admin-select admin-order-status-select"
                            value={o.status || 'new'}
                            onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                            aria-label={t('admin.changeStatusAria', { id: o.number || o.id })}
                          >
                            <option value="new">{t('admin.orderNew')}</option>
                            <option value="shipped">{t('admin.orderShipped')}</option>
                            <option value="delivered">{t('admin.orderDelivered')}</option>
                          </select>
                          <a
                            className="admin-icon-btn"
                            href={buildWhatsAppLink(o, t)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t('admin.contactCustomerAria', { id: o.number || o.id })}
                          >
                            <WhatsAppIcon size={16} />
                          </a>
                          <button
                            type="button"
                            className="admin-icon-btn"
                            onClick={() => confirmDelete(o)}
                            aria-label={t('admin.deleteOrderAria', { id: o.number || o.id })}
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-mobile-cards admin-mobile-only">
              {filtered.map((o) => (
                <article key={o.id} className="admin-product-card admin-order-card">
                  <div className="admin-order-card-body">
                    <div className="admin-order-card-head">
                      <span className="admin-order-no">#{o.number || o.id}</span>
                      <span className={`admin-status ${STATUS_CLASS[o.status || 'new']}`}>
                        <span className="admin-status-dot" />
                        {statusLabel(o.status)}
                      </span>
                    </div>
                    <span className="admin-table-name">{o.customer.fullName}</span>
                    <span className="admin-colors-count">{o.customer.phone} · {o.customer.city}</span>
                    <span className="admin-colors-count">{fmtDate(o.date)}</span>
                    <div className="admin-order-items">
                      {o.items.map((i, idx) => (
                        <span key={idx} className="admin-order-item">
                          {i.image ? (
                            <button
                              type="button"
                              className="admin-order-item-img-btn"
                              onClick={() => setPreview({ src: i.image, alt: i.name })}
                              aria-label={t('admin.viewImage')}
                              title={t('admin.viewImage')}
                            >
                              <img className="admin-order-item-img" src={cloudinaryUrl(i.image, { width: 240 })} srcSet={cloudinarySrcSet(i.image, [120, 240])} sizes="60px" alt={i.name} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            </button>
                          ) : null}
                          {i.qty}× {i.name}
                          {i.size && i.size !== 'One Size' ? ` (${i.size})` : ''}
                          {colorLabel(i) ? ` — ${colorLabel(i)}` : ''}
                        </span>
                      ))}
                    </div>
                    <span className="admin-colors-count">{o.customer.address}</span>
                    {o.customer.notes && <span className="admin-colors-count">“{o.customer.notes}”</span>}
                    <div className="admin-order-card-total">
                      <span className="admin-order-total">{money(o.total)}</span>
                      <span className="admin-pill">{t(`checkout.${o.payment}`, { defaultValue: o.payment })}</span>
                    </div>
                  </div>
                  <div className="admin-order-card-actions">
                    <select
                      className="admin-select admin-order-status-select"
                      value={o.status || 'new'}
                      onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                      aria-label={t('admin.changeStatusAria', { id: o.number || o.id })}
                    >
                      <option value="new">{t('admin.orderNew')}</option>
                      <option value="shipped">{t('admin.orderShipped')}</option>
                      <option value="delivered">{t('admin.orderDelivered')}</option>
                    </select>
                    <a
                      className="admin-icon-btn"
                      href={buildWhatsAppLink(o, t)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('admin.contactCustomerAria', { id: o.number || o.id })}
                    >
                      <WhatsAppIcon size={16} />
                    </a>
                    <button
                      type="button"
                      className="admin-icon-btn"
                      onClick={() => confirmDelete(o)}
                      aria-label={t('admin.deleteOrderAria', { id: o.number || o.id })}
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {preview && (
        <div className="admin-lightbox" role="dialog" aria-modal="true" aria-label={t('admin.viewImage')} onClick={() => setPreview(null)}>
          <button type="button" className="admin-lightbox-close" aria-label={t('admin.closeImage')} onClick={(e) => { e.stopPropagation(); setPreview(null); }}>×</button>
          <img src={cloudinaryUrl(preview.src, { width: 1200 })} srcSet={cloudinarySrcSet(preview.src, [480, 800, 1200])} sizes="(max-width: 600px) 100vw, 80vw" alt={preview.alt} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
