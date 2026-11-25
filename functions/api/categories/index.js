// GET /api/categories  — public
// POST /api/categories — admin: add category
import { json, bad, readJson } from '../../_lib/util.js';
import { requireAdmin } from '../../_lib/auth.js';
import { validateCategory } from '../../_lib/validation.js';

export async function onRequestGet(context) {
  const { results } = await context.env.DB
    .prepare('SELECT id, data FROM categories ORDER BY position DESC')
    .all();
  return json({ categories: results.map((r) => ({ ...JSON.parse(r.data), id: r.id })) });
}

export async function onRequestPost(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const body = await readJson(context.request);
  const validationError = validateCategory(body);
  if (validationError) return bad(validationError);

  const exists = await context.env.DB.prepare('SELECT id FROM categories WHERE id = ?').bind(body.id).first();
  if (exists) return bad('A category with this id already exists.', 409);

  const doc = { ...body, id: body.id };
  const positionRow = await context.env.DB
    .prepare('SELECT MIN(position) AS position FROM categories')
    .first();
  const position = (positionRow?.position ?? 0) - 1;
  await context.env.DB
    .prepare('INSERT INTO categories (id, data, position) VALUES (?, ?, ?)')
    .bind(body.id, JSON.stringify(doc), position)
    .run();
  return json({ ok: true, category: doc }, { status: 201 });
}
