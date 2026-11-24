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

  const doc = { enabled: body.enabled !== false, banners: body.banners };
  await context.env.DB
    .prepare('INSERT INTO shop_ads (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data')
    .bind(JSON.stringify(doc))
    .run();
  return json({ ok: true, ads: doc });
}
