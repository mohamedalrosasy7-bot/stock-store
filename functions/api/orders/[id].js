// PATCH /api/orders/:id — admin: update order status
// DELETE /api/orders/:id — admin: remove an order
import { json, bad, readJson } from '../../_lib/util.js';
import { requireAdmin } from '../../_lib/auth.js';

const ALLOWED = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export async function onRequestPatch(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const { status } = await readJson(context.request);
  if (!ALLOWED.includes(status)) return bad(`status must be one of: ${ALLOWED.join(', ')}`);

  const row = await context.env.DB.prepare('SELECT data FROM orders WHERE id = ?').bind(context.params.id).first();
  if (!row) return bad('Order not found.', 404);

  const doc = { ...JSON.parse(row.data), status };
  await context.env.DB
    .prepare('UPDATE orders SET status = ?, data = ? WHERE id = ?')
    .bind(status, JSON.stringify(doc), context.params.id)
    .run();
  return json({ ok: true, order: doc });
}

export async function onRequestDelete(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const row = await context.env.DB.prepare('SELECT id FROM orders WHERE id = ?').bind(context.params.id).first();
  if (!row) return bad('Order not found.', 404);
  await context.env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(context.params.id).run();
  return json({ ok: true });
}
