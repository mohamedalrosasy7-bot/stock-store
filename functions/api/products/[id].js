// PUT /api/products/:id    — admin: replace product document
// DELETE /api/products/:id — admin
import { json, bad, readJson } from '../../_lib/util.js';
import { requireAdmin } from '../../_lib/auth.js';

export async function onRequestPut(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const id = context.params.id;
  const body = await readJson(context.request);
  if (!body?.name) return bad('Name is required.');

  const exists = await context.env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(id).first();
  if (!exists) return bad('Product not found.', 404);

  const doc = { ...body, id };
  await context.env.DB
    .prepare('UPDATE products SET data = ? WHERE id = ?')
    .bind(JSON.stringify(doc), id)
    .run();
  return json({ ok: true, product: doc });
}

export async function onRequestDelete(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  await context.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(context.params.id).run();
  return json({ ok: true });
}
