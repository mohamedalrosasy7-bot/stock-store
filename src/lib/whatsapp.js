import { STORE, money } from '../config';

const webUrl = (value) => {
  if (typeof value !== 'string' || !value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
};

// WhatsApp message the customer sends to the store right after confirming an
// order. Shared by the auto-opened tab at checkout and the manual button on
// the order-success page so both always carry the exact same text.
export const buildCustomerWhatsAppLink = (order, t) => {
  const lines = order.items.map((item) => {
    const imageLink = webUrl(item.image);
    return [
      t('order.line', { qty: item.qty, name: item.name, size: item.size, color: item.color, total: money(item.total) }),
      imageLink ? `${t('order.waProductImage')}: ${imageLink}` : '',
    ].filter(Boolean).join('\n');
  }).join('\n');
  const paymentLabel =
    order.payment === 'cod' ? t('checkout.cod') : order.payment === 'instapay' ? t('checkout.instapay') : t('checkout.ewallet');
  const message = [
    t('order.hello', { store: STORE.name, id: order.number || order.id }),
    lines,
    `${t('order.subtotal')}: ${money(order.subtotal)}`,
    `${t('order.shipping')}: ${order.shipping === 0 ? t('order.free') : money(order.shipping)}`,
    `${t('order.total')}: ${money(order.total)} (${paymentLabel})`,
    `${t('order.waName')}: ${order.customer.fullName}`,
    `${t('order.waPhone')}: ${order.customer.phone}`,
    `${t('order.waAddress')}: ${order.customer.address}, ${order.customer.city}`,
    order.customer.notes ? `${t('order.waNotes')}: ${order.customer.notes}` : '',
  ].filter(Boolean).join('\n');
  return `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(message)}`;
};