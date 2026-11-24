// GET /api/orders     — admin: list orders
// POST /api/orders    — public: place an order from the storefront
import { json, bad, readJson, rateLimit } from '../../_lib/util.js';
import { requireAdmin } from '../../_lib/auth.js';

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
  if (!body.customer?.name || !body.customer?.phone) return bad('Customer name and phone are required.');

  // Prices come from the catalog, never from the browser.
  const { results } = await context.env.DB.prepare('SELECT id, data FROM products').all();
  const byId = new Map((results || []).map((r) => [r.id, JSON.parse(r.data)]));
  let subtotal = 0;
  const orderItems = items.map((it) => {
    const product = byId.get(it.id);
    if (!product) throw new Error(`Unknown product ${it.id}`);
    const unit = product.salePrice ?? product.price;
    const qty = Math.max(1, Math.min(99, Number(it.qty) || 1));
    subtotal += unit * qty;
    return {
      id: product.id,
      name: product.name,
      size: it.size || null,
      color: it.color || null,
      qty,
      unit,
      total: unit * qty,
      // display-only: keep the image the customer saw, else the product cover
      image: typeof it.image === 'string' ? it.image.slice(0, 500) : (product.images?.[0] || null),
    };
  });
  const shipping = subtotal >= 2500 ? 0 : 120;
  const total = subtotal + shipping;

  const id = orderId();
  const payment = PAYMENTS.includes(body.payment) ? body.payment : 'cod';
  const doc = {
    id,
    date: new Date().toISOString(),
    customer: {
      fullName: String(body.customer.name).slice(0, 120),
      phone: String(body.customer.phone).slice(0, 40),
      address: String(body.customer.address || '').slice(0, 400),
      city: String(body.customer.city || '').slice(0, 80),
      notes: String(body.customer.note || '').slice(0, 400),
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
