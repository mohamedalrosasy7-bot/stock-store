// GET /api/settings — public: seasonal visibility + other site settings
// PUT /api/settings — admin: merge new values
import { json, bad, readJson } from '../_lib/util.js';
import { requireAdmin } from '../_lib/auth.js';

export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of results || []) {
    if (row.key === 'catalogVersion') continue;
    try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
  }
  return json({ settings });
}

export async function onRequestPut(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const body = await readJson(context.request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('Expected a settings object.');
  if (Object.keys(body).some((key) => !['hiddenSeasons', 'heroImage'].includes(key))) return bad('Unsupported setting.');
  if (body.hiddenSeasons != null) {
    const seasons = body.hiddenSeasons;
    if (
      typeof seasons !== 'object' || Array.isArray(seasons) ||
      Object.keys(seasons).some((season) => !['winter', 'summer'].includes(season)) ||
      Object.values(seasons).some((hidden) => typeof hidden !== 'boolean')
    ) return bad('hiddenSeasons must contain boolean winter/summer values.');
  }
  if (Object.prototype.hasOwnProperty.call(body, 'heroImage') && (
    typeof body.heroImage !== 'string' ||
    body.heroImage.length > 1_500_000 ||
    (body.heroImage !== '' &&
      !/^https:\/\/\S+$/i.test(body.heroImage) &&
      !/^data:image\/(?:jpeg|png|webp|gif|avif);base64,[a-z0-9+/]+=*$/i.test(body.heroImage))
  )) return bad('heroImage must be an HTTPS image URL or an empty string.');

  const stmt = context.env.DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const batch = Object.entries(body).map(([key, value]) => stmt.bind(key, JSON.stringify(value)));
  if (batch.length) await context.env.DB.batch(batch);
  return json({ ok: true, settings: body });
}
