// PUT /api/categories/reorder — admin: update storefront category order
import { json, bad, readJson } from '../../_lib/util.js';
import { requireAdmin } from '../../_lib/auth.js';

export async function onRequestPut(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const body = await readJson(context.request);
  if (
    !body ||
    !Array.isArray(body.ids) ||
    body.ids.length === 0 ||
    body.ids.length > 200 ||
    body.ids.some((id) => typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) ||
    new Set(body.ids).size !== body.ids.length
  ) {
    return bad('A valid category order is required.');
  }

  const { results } = await context.env.DB.prepare('SELECT id FROM categories').all();
  const existingIds = (results || []).map((row) => row.id);
  if (
    body.ids.length !== existingIds.length ||
    body.ids.some((id) => !existingIds.includes(id))
  ) {
    return bad('The category list changed. Reload and try again.', 409);
  }

  const updates = body.ids.map((id, index) =>
    context.env.DB
      .prepare('UPDATE categories SET position = ? WHERE id = ?')
      .bind(body.ids.length - index, id)
  );
  await context.env.DB.batch(updates);
  return json({ ok: true });
}
