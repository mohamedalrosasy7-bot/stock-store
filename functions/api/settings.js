// GET /api/settings — public: seasonal visibility + other site settings
// PUT /api/settings — admin: merge new values
import { json, bad, readJson } from '../_lib/util.js';
import { requireAdmin } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of results || []) {
    try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
  }
  return json({ settings });
}

export async function onRequestPut(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const body = await readJson(context.request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('Expected a settings object.');

  const stmt = context.env.DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const batch = Object.entries(body).map(([key, value]) => stmt.bind(key, JSON.stringify(value)));
  await context.env.DB.batch(batch);
  return json({ ok: true, settings: body });
}
