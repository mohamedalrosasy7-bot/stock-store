// PUT /api/categories/:id    — admin: update category
// DELETE /api/categories/:id — admin
import { json, bad, readJson } from '../../_lib/util.js';
import { requireAdmin } from '../../_lib/auth.js';
import { validateCategory } from '../../_lib/validation.js';

export async function onRequestPut(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const id = context.params.id;
  const body = await readJson(context.request);
  const validationError = validateCategory(body, { requireId: false });
  if (validationError) return bad(validationError);

  const row = await context.env.DB.prepare('SELECT data FROM categories WHERE id = ?').bind(id).first();
  if (!row) return bad('Category not found.', 404);

  const doc = { ...JSON.parse(row.data), ...body, id };
  await context.env.DB
    .prepare('UPDATE categories SET data = ? WHERE id = ?')
    .bind(JSON.stringify(doc), id)
    .run();
  return json({ ok: true, category: doc });
}

export async function onRequestDelete(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const id = context.params.id;

  const inUse = await context.env.DB
    .prepare('SELECT id FROM products WHERE json_extract(data, "$.category") = ? LIMIT 1')
    .bind(id)
    .first();
  if (inUse) return bad('Cannot delete a category that still has products.', 409);

  const remaining = await context.env.DB.prepare('SELECT COUNT(*) AS n FROM categories').first();
  if ((remaining?.n || 0) <= 1) return bad('At least one category must remain.', 409);

  const deleted = await context.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  if (!deleted.meta?.changes) return bad('Category not found.', 404);
  return json({ ok: true });
}
