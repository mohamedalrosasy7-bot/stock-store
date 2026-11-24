// GET /api/ads — public: { enabled, banners }
// PUT /api/ads — admin: replace the whole ads document
import { json, bad, readJson } from '../_lib/util.js';
import { requireAdmin } from '../_lib/auth.js';

const DEFAULT_ADS = { enabled: true, banners: [] };

export async function onRequestGet(context) {
  const row = await context.env.DB.prepare('SELECT data FROM shop_ads WHERE id = 1').first();
  return json(row ? JSON.parse(row.data) : DEFAULT_ADS);
}

export async function onRequestPut(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const body = await readJson(context.request);
  if (!body || !Array.isArray(body.banners)) return bad('banners array is required.');
  if (body.banners.length > 100) return bad('At most 100 ad banners can be stored.');
  const ids = new Set();
  for (const banner of body.banners) {
    if (!banner || typeof banner !== 'object' || Array.isArray(banner)) return bad('Each banner must be an object.');
    if (typeof banner.id !== 'string' || !banner.id.trim() || banner.id.length > 120 || ids.has(banner.id)) {
      return bad('Each banner needs a unique id of at most 120 characters.');
    }
    ids.add(banner.id);
    if (typeof banner.src !== 'string' || !banner.src || banner.src.length > 1_500_000) return bad('Each banner needs a valid image.');
    if (banner.name != null && (typeof banner.name !== 'string' || banner.name.length > 160)) return bad('Banner name is too long.');
  }
  if (new TextEncoder().encode(JSON.stringify(body.banners)).byteLength > 1_800_000) {
    return bad('Advertisement data is too large to store. Upload optimized images and retry.');
  }

  const doc = { enabled: body.enabled !== false, banners: body.banners };
  await context.env.DB
    .prepare('INSERT INTO shop_ads (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data')
    .bind(JSON.stringify(doc))
    .run();
  return json({ ok: true, ads: doc });
}
