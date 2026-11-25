// GET /api/products        — public (storefront catalog)
// POST /api/products       — admin: create product
import { json, bad, readJson } from '../../_lib/util.js';
import { requireAdmin } from '../../_lib/auth.js';
import { validateProduct } from '../../_lib/validation.js';

const slugify = (s) =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `p-${Date.now()}`;

export async function onRequestGet(context) {
  const { results } = await context.env.DB
    .prepare('SELECT id, data FROM products ORDER BY position DESC')
    .all();
  const products = results.map((r) => ({ ...JSON.parse(r.data), id: r.id }));
  return json({ products: (await requireAdmin(context)) ? products : products.filter((p) => p.active !== false) });
}

export async function onRequestPost(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const body = await readJson(context.request);
  const validationError = validateProduct(body);
  if (validationError) return bad(validationError);

  let id = slugify(body.id || body.name);
  const taken = await context.env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(id).first();
  if (taken) id = `${id}-${Date.now().toString(36)}`;

  const doc = { ...body, id };
  await context.env.DB
    .prepare('INSERT INTO products (id, data, position) VALUES (?, ?, ?)')
    .bind(id, JSON.stringify(doc), Date.now())
    .run();

  return json({ ok: true, product: doc }, { status: 201 });
}
