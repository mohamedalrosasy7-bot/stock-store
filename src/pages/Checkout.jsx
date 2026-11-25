import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { STORE, money } from '../config';
import { colorImage } from '../data/products';
import { useAdmin } from '../context/AdminContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LangContext';
import { useOrders } from '../context/OrdersContext';
import { useSEO } from '../hooks/useSEO';
import { buildCustomerWhatsAppLink } from '../lib/whatsapp';
import ProductImage from '../components/ProductImage';
import { CashIcon, InstapayIcon, WalletIcon } from '../components/Icons';

const CITIES = ['Cairo', 'Giza', 'Alexandria', 'Mansoura', 'Tanta', 'Port Said', 'Suez', 'Ismailia', 'Luxor', 'Aswan', 'Hurghada', 'Sharm El Sheikh', 'Damanhour', 'Zagazig', 'Asyut'];

const makeValidators = () => ({
  fullName: (v) => (v.trim().length >= 3 ? '' : 'checkout.errFullName'),
  phone: (v) => (/^\+?[\d\s-]{9,15}$/.test(v.trim()) ? '' : 'checkout.errPhone'),
  address: (v) => (v.trim().length >= 8 ? '' : 'checkout.errAddress'),
  city: (v) => (v.trim().length >= 2 ? '' : 'checkout.errCity'),
});

export default function Checkout() {
  const { t } = useLang();
  const validators = makeValidators();
  useSEO(t('checkout.title'));
  const { lines, subtotal, shipping, total, clear } = useCart();
  // Live admin catalog (includes color images uploaded from the admin panel);
  // the cart's static product snapshot doesn't have them.
  const { products: liveProducts } = useAdmin();
  const { addOrder } = useOrders();
  const navigate = useNavigate();
  const toast = useToast();
  const placed = useRef(false);
  const [form, setForm] = useState({ fullName: '', phone: '', address: '', city: '', notes: '', payment: 'cod' });
  const remaining = subtotal >= STORE.freeShippingThreshold ? 0 : STORE.freeShippingThreshold - subtotal;
  const freeShippingProgress = Math.min(100, Math.max(0, (subtotal / STORE.freeShippingThreshold) * 100));
  const [errors, setErrors] = useState({});
  const [placing, setPlacing] = useState(false);

  if (lines.length === 0 && !placed.current) return <Navigate to="/cart" replace />;

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: validators[field]?.(value) || '' }));
  };

  const blur = (field) => () => setErrors((er) => ({ ...er, [field]: validators[field](form[field]) }));

  // The order stores the image of the color the customer actually picked, so
  // the admin dashboard shows the right variant — not the product's main photo.
  const liveProduct = (line) => liveProducts.find((p) => p.id === line.product.id) || line.product;
  const lineImage = (line) => colorImage(liveProduct(line), line.color) || (line.product.images || [])[0] || '';

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    Object.keys(validators).forEach((k) => {
      const msg = validators[k](form[k]);
      if (msg) found[k] = msg;
    });
    setErrors(found);
    if (Object.keys(found).length) {
      toast('checkout.fixFields', 'error');
      const first = document.querySelector(`[name="${Object.keys(found)[0]}"]`);
      first?.focus();
      return;
    }

    setPlacing(true);
    try {
      await placeOrder();
    } finally {
      setPlacing(false);
    }
  };
  // Places the order via POST /api/orders (server re-derives all prices),
  // then sends the details to the store WhatsApp. Must run inside the user's
  // original click: the WhatsApp tab is opened synchronously before any await.
  const placeOrder = async () => {
    const waWindow = window.open('', '_blank');

    // normalize the city back to its canonical English key so orders/WhatsApp
    // messages stay consistent regardless of the UI language
    const cityLabel = form.city.trim();
    const canonicalCity = CITIES.find((c) => t(`checkout.cities.${c}`) === cityLabel) || cityLabel;
    const order = {
      date: new Date().toISOString(),
      customer: {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: canonicalCity,
        notes: form.notes.trim(),
      },
      payment: form.payment === 'cod' ? 'cod' : form.payment === 'instapay' ? 'instapay' : 'ewallet',
      items: lines.map((l) => ({
        id: l.product.id,
        name: l.product.name,
        size: l.size,
        color: l.color,
        qty: l.qty,
        unit: l.unit,
        total: l.total,
        image: lineImage(l),
      })),
      subtotal,
      shipping,
      total,
    };

    let saved;
    try {
      saved = await addOrder(order);
    } catch {
      try { waWindow?.close(); } catch { /* already gone */ }
      toast('checkout.orderFailed', 'error');
      return;
    }

    // Send the order details to the store's WhatsApp automatically — the
    // customer just presses Send in the opened chat.
    const waLink = buildCustomerWhatsAppLink(saved, t);
    if (waWindow && !waWindow.closed) {
      try {
        waWindow.location.replace(waLink);
      } catch {
        window.open(waLink, '_blank', 'noopener');
      }
    }

    placed.current = true;
    navigate(`/order/${saved.id}`, { replace: true, state: { order: saved } });
    clear();
  };

  const field = (name, label, props = {}) => (
    <div className={`field ${errors[name] ? 'invalid' : ''}`}>
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} value={form[name]} onChange={set(name)} onBlur={blur(name)} aria-invalid={!!errors[name]} {...props} />
      {errors[name] && <span className="field-error">{t(errors[name])}</span>}
    </div>
  );

  return (
    <div className="container page-pad">
      <div className="page-head">
        <p className="eyebrow">{t('checkout.almostThere')}</p>
        <h1>{t('checkout.title')}</h1>
      </div>

      <form className="cart-layout" onSubmit={submit} noValidate>
        <div className="checkout-form">
          <h2>{t('checkout.deliveryDetails')}</h2>
          <div className="form-grid">
            {field('fullName', t('checkout.fullName'), { autoComplete: 'name', placeholder: t('checkout.namePlaceholder') })}
            {field('phone', t('checkout.phone'), { type: 'tel', autoComplete: 'tel', placeholder: t('checkout.phonePlaceholder') })}
            <div className="span-2">{field('address', t('checkout.address'), { autoComplete: 'street-address', placeholder: t('checkout.addressPlaceholder') })}</div>
            {field('city', t('checkout.city'), { list: 'cities', autoComplete: 'address-level2', placeholder: t('checkout.cityPlaceholder') })}
            <datalist id="cities">
              {CITIES.map((c) => (
                <option key={c} value={t(`checkout.cities.${c}`, { defaultValue: c })} />
              ))}
            </datalist>
            <div className="field">
              <label htmlFor="notes">{t('checkout.notes')}</label>
              <input id="notes" name="notes" value={form.notes} onChange={set('notes')} placeholder={t('checkout.notesPlaceholder')} />
            </div>
          </div>

          <h2>{t('checkout.paymentMethod')}</h2>
          <div className="pay-grid">
            <label className={`pay-option ${form.payment === 'cod' ? 'selected' : ''}`}>
              <input type="radio" name="payment" value="cod" checked={form.payment === 'cod'} onChange={() => setForm((f) => ({ ...f, payment: 'cod' }))} />
              <CashIcon size={22} />
              <div>
                <strong>{t('checkout.cod')}</strong>
                <span>{t('checkout.codHint')}</span>
              </div>
            </label>
            <label className={`pay-option ${form.payment === 'instapay' ? 'selected' : ''}`}>
              <input type="radio" name="payment" value="instapay" checked={form.payment === 'instapay'} onChange={() => setForm((f) => ({ ...f, payment: 'instapay' }))} />
              <InstapayIcon size={34} />
              <div>
                <strong>{t('checkout.instapay')}</strong>
                <span>{t('checkout.instapayHint')}</span>
              </div>
            </label>
            <label className={`pay-option ${form.payment === 'ewallet' ? 'selected' : ''}`}>
              <input type="radio" name="payment" value="ewallet" checked={form.payment === 'ewallet'} onChange={() => setForm((f) => ({ ...f, payment: 'ewallet' }))} />
              <WalletIcon size={34} />
              <div>
                <strong>{t('checkout.ewallet')}</strong>
                <span>{t('checkout.ewalletHint')}</span>
              </div>
            </label>
          </div>
        </div>

        <aside className="summary">
          <h2>{t('checkout.orderSummary')}</h2>
          <div className={`summary-shipping-progress ${remaining === 0 ? 'complete' : ''}`}>
            <div className="summary-shipping-copy">
              <span>{remaining === 0 ? t('cart.free') : t('cart.shipping')}</span>
              <strong>{remaining === 0 ? t('cart.free') : money(STORE.shippingFee)}</strong>
            </div>
            <div className="summary-progress-track" aria-label={t('cart.summary')}>
              <span style={{ width: `${freeShippingProgress}%` }} />
            </div>
            {remaining > 0 && (
              <p className="summary-shipping-note">
                {t('cart.addMoreFreeShipping', { amount: money(remaining) })}
              </p>
            )}
          </div>
          <ul className="summary-items">
            {lines.map((l) => (
              <li key={l.key}>
                <div className="summary-img">
                  <ProductImage
                    src={lineImage(l)}
                    alt={l.product.name}
                    cloudinaryWidth={240}
                    cloudinaryWidths={[160, 240]}
                    sizes="48px"
                  />
                  <span className="qty-badge">{l.qty}</span>
                </div>
                <div>
                  <strong>{l.product.name}</strong>
                  <span className="muted small">{l.size !== 'One Size' && `${l.size} · `}{l.color}</span>
                </div>
                <span>{money(l.total)}</span>
              </li>
            ))}
          </ul>
          <dl>
            <div><dt>{t('cart.subtotal')}</dt><dd>{money(subtotal)}</dd></div>
            <div><dt>{t('cart.shipping')}</dt><dd>{shipping === 0 ? t('cart.free') : money(shipping)}</dd></div>
            <div className="grand"><dt>{t('cart.total')}</dt><dd>{money(total)}</dd></div>
          </dl>
          <button type="submit" className="btn btn-lg btn-full" disabled={placing}>{placing ? t('checkout.placingOrder') : t('checkout.confirmOrder')}</button>
          <p className="muted small center">
            {t('checkout.youWillPay', {
              amount: money(total),
              method: form.payment === 'cod' ? t('checkout.codShort') : form.payment === 'instapay' ? t('checkout.instapay') : t('checkout.ewallet'),
            })}
          </p>
        </aside>
      </form>
    </div>
  );
}
