// GET /api/orders     — admin: list orders
// POST /api/orders    — public: place an order from the storefront
import { json, bad, readJson, rateLimit } from '../../_lib/util.js';
import { requireAdmin } from '../../_lib/auth.js';
import { STORE_PRICING } from '../../../shared/pricing.js';

const orderId = () => `ord_${Date.now().toString(36)}${crypto.randomUUID().slice(0, 6)}`;

export async function onRequestGet(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const { results } = await context.env.DB
    .prepare('SELECT rowid AS number, id, data, status, total, created_at FROM orders ORDER BY rowid DESC LIMIT 200')
    .all();
  return json({ orders: (results || []).map((r) => {
    const doc = JSON.parse(r.data);
    return {
      ...doc,
      id: r.id,
      number: r.number,
      status: r.status,
      total: r.total,
      date: doc.date || r.created_at,
    };
  }) });
}

const PAYMENTS = ['cod', 'instapay', 'ewallet'];

export async function onRequestPost(context) {
  const ip = context.request.headers.get('CF-Connecting-IP') || 'local';
  if (!rateLimit(`orders:${ip}`, 6, 60_000)) return bad('Too many requests, please slow down.', 429);

  const body = await readJson(context.request);
  const items = Array.isArray(body?.items) ? body.items : null;
  if (!items || !items.length) return bad('Order must contain at least one item.');
  if (items.length > 50) return bad('Order contains too many line items.');
  if (!body.customer || typeof body.customer !== 'object' || Array.isArray(body.customer)) {
    return bad('Customer details are required.');
  }
  const customer = {
    name: String(body.customer.name || '').trim(),
    phone: String(body.customer.phone || '').trim(),
    address: String(body.customer.address || '').trim(),
    city: String(body.customer.city || '').trim(),
    note: String(body.customer.note || '').trim(),
  };
  if (customer.name.length < 3 || customer.name.length > 120) return bad('Enter a valid customer name.');
  if (customer.phone.length < 9 || customer.phone.length > 40) return bad('Enter a valid phone number.');
  if (customer.address.length < 8 || customer.address.length > 400) return bad('Enter a valid address.');
  if (customer.city.length < 2 || customer.city.length > 80) return bad('Enter a valid city.');

  // Prices come from the catalog, never from the browser.
  const { results } = await context.env.DB.prepare('SELECT id, data FROM products').all();
  const byId = new Map((results || []).map((r) => [r.id, JSON.parse(r.data)]));
  let subtotal = 0;
  const orderItems = [];
  for (const rawItem of items) {
    const it = rawItem && typeof rawItem === 'object' && !Array.isArray(rawItem) ? rawItem : {};
    const product = byId.get(it?.id);
    if (!product) return bad('An order item is no longer available.', 409);
    if (product.active === false || product.soldOut === true) return bad(`${product.name} is unavailable.`, 409);

    const qty = Number(it.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) return bad('Each quantity must be between 1 and 10.');
    const size = String(it.size || '').trim();
    const color = String(it.color || '').trim();
    if (Array.isArray(product.sizes) && product.sizes.length && !product.sizes.includes(size)) {
      return bad(`The selected size for ${product.name} is unavailable.`, 409);
    }
    if (Array.isArray(product.colors) && product.colors.length && !product.colors.some((c) => c.name === color)) {
      return bad(`The selected color for ${product.name} is unavailable.`, 409);
    }
    if ((product.soldOutSizes || []).includes(size) || (product.soldOutColors || []).includes(color)) {
      return bad(`The selected variant for ${product.name} is sold out.`, 409);
    }

    const unit = Number(product.salePrice ?? product.price);
    if (!Number.isFinite(unit) || unit < 0) return bad(`${product.name} has an invalid price.`, 409);
    subtotal += unit * qty;
    orderItems.push({
      id: product.id,
      name: product.name,
      size: size || null,
      color: color || null,
      qty,
      unit,
      total: unit * qty,
      // Display only. The amount and product identity always come from D1.
      image: typeof it.image === 'string' ? it.image.slice(0, 500) : (product.images?.[0] || null),
    });
  }
  const shipping = subtotal >= STORE_PRICING.freeShippingThreshold ? 0 : STORE_PRICING.shippingFee;
  const total = subtotal + shipping;

  const id = orderId();
  const payment = PAYMENTS.includes(body.payment) ? body.payment : 'cod';
  const doc = {
    id,
    date: new Date().toISOString(),
    customer: {
      fullName: customer.name,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      notes: customer.note.slice(0, 400),
    },
    payment,
    items: orderItems,
    subtotal,
    shipping,
    total,
    status: 'new',
  };

  const inserted = await context.env.DB
    .prepare('INSERT INTO orders (id, data, status, total) VALUES (?, ?, ?, ?) RETURNING rowid AS number')
    .bind(id, JSON.stringify(doc), 'new', total)
    .first();

  return json({ ok: true, order: { ...doc, number: inserted.number } }, { status: 201 });
}
