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
  if (Object.keys(body).some((key) => !['hiddenSeasons', 'heroImage', 'offerImage', 'offerContent'].includes(key))) return bad('Unsupported setting.');
  if (body.hiddenSeasons != null) {
    const seasons = body.hiddenSeasons;
    if (
      typeof seasons !== 'object' || Array.isArray(seasons) ||
      Object.keys(seasons).some((season) => !['winter', 'summer'].includes(season)) ||
      Object.values(seasons).some((hidden) => typeof hidden !== 'boolean')
    ) return bad('hiddenSeasons must contain boolean winter/summer values.');
  }
  for (const key of ['heroImage', 'offerImage']) {
    const image = body[key];
    if (Object.prototype.hasOwnProperty.call(body, key) && (
      typeof image !== 'string' ||
      image.length > 1_500_000 ||
      (image !== '' &&
        !/^https:\/\/\S+$/i.test(image) &&
        !/^data:image\/(?:jpeg|png|webp|gif|avif);base64,[a-z0-9+/]+=*$/i.test(image))
    )) return bad(`${key} must be an HTTPS image URL or an empty string.`);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'offerContent')) {
    const content = body.offerContent;
    const locales = ['ar', 'en'];
    const fields = { eyebrow: 100, title: 240, description: 500, button: 100 };
    if (
      !content || typeof content !== 'object' || Array.isArray(content) ||
      Object.keys(content).some((locale) => !locales.includes(locale)) ||
      locales.some((locale) => {
        const copy = content[locale];
        return !copy || typeof copy !== 'object' || Array.isArray(copy) ||
          Object.keys(copy).some((field) => !Object.prototype.hasOwnProperty.call(fields, field)) ||
          Object.entries(fields).some(([field, maxLength]) =>
            typeof copy[field] !== 'string' || copy[field].length > maxLength
          );
      })
    ) return bad('offerContent must provide valid Arabic and English banner text.');
  }

  const stmt = context.env.DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const batch = Object.entries(body).map(([key, value]) => stmt.bind(key, JSON.stringify(value)));
  if (batch.length) await context.env.DB.batch(batch);
  return json({ ok: true, settings: body });
}
