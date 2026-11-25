import { Link, useLocation, useParams } from 'react-router-dom';
import { money } from '../config';
import { useLang } from '../context/LangContext';
import { useSEO } from '../hooks/useSEO';
import { buildCustomerWhatsAppLink } from '../lib/whatsapp';
import { ArrowIcon, CheckIcon, WhatsAppIcon } from '../components/Icons';

const findOrder = (id, stateOrder) => (stateOrder && stateOrder.id === id ? stateOrder : null);

export default function OrderSuccess() {
  const { t, lang } = useLang();
  useSEO(t('order.confirmed'));
  const { id } = useParams();
  const { state } = useLocation();
  const order = findOrder(id, state?.order);

  if (!order) {
    return (
      <div className="container empty page-pad">
        <h1>{t('order.notFound')}</h1>
        <p className="muted">{t('order.notFoundHint')}</p>
        <Link to="/shop" className="btn btn-lg btn-discover">
          {t('order.continueShopping')} <ArrowIcon size={16} />
        </Link>
      </div>
    );
  }

  const paymentLabel =
    order.payment === 'cod' ? t('checkout.cod') : order.payment === 'instapay' ? t('checkout.instapay') : t('checkout.ewallet');
  // Same message the store receives: the checkout auto-opens this link and
  // this button keeps working as a manual fallback.
  const wa = buildCustomerWhatsAppLink(order, t);

  return (
    <div className="container page-pad success">
      <div className="success-icon"><CheckIcon size={36} /></div>
      <p className="eyebrow">{t('order.thankYou', { name: order.customer.fullName.split(' ')[0] })}</p>
      <h1>{t('order.confirmed')}</h1>
      <p className="muted">
        {t('order.order', {
          id: order.number || order.id,
          date: new Date(order.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG', { day: 'numeric', month: 'long', year: 'numeric' }),
        })}
      </p>

      <div className="success-card">
        <div className="success-cols">
          <div>
            <h3>{t('order.deliveringTo')}</h3>
            <p>{order.customer.fullName}<br />{order.customer.address}<br />{t(`checkout.cities.${order.customer.city}`, { defaultValue: order.customer.city })}<br />{order.customer.phone}</p>
          </div>
          <div>
            <h3>{t('order.payment')}</h3>
            <p>{paymentLabel}<br /><span className="muted">{t('order.payOnDelivery', { amount: money(order.total) })}</span></p>
          </div>
        </div>
        <ul className="summary-items">
          {order.items.map((i, idx) => (
            <li key={idx}>
              <div className="summary-img"><img src={i.image} alt={i.name} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /><span className="qty-badge">{i.qty}</span></div>
              <div>
                <strong>{i.name}</strong>
                <span className="muted small">{i.size && i.size !== 'One Size' && `${i.size} · `}{i.color}</span>
              </div>
              <span>{money(i.total)}</span>
            </li>
          ))}
        </ul>
        <dl>
          <div><dt>{t('order.subtotal')}</dt><dd>{money(order.subtotal)}</dd></div>
          <div><dt>{t('order.shipping')}</dt><dd>{order.shipping === 0 ? t('order.free') : money(order.shipping)}</dd></div>
          <div className="grand"><dt>{t('order.total')}</dt><dd>{money(order.total)}</dd></div>
        </dl>
      </div>

      <div className="hero-actions center">
        <Link to="/shop" className="btn btn-lg btn-discover">
          {t('order.continueShopping')} <ArrowIcon size={16} />
        </Link>
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-lg">
          <WhatsAppIcon size={18} /> {t('order.sendWhatsapp')}
        </a>
      </div>
    </div>
  );
}
