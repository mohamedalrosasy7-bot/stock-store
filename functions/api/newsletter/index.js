// POST /api/newsletter — public: subscribe an email (validated + rate-limited).
// GET  /api/newsletter — admin: list subscribers (?export=csv for download).
import { json, bad, readJson, rateLimit } from '../../_lib/util.js';
import { requireAdmin } from '../../_lib/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function onRequestGet(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const { results } = await context.env.DB
    .prepare('SELECT email, created_at FROM newsletter ORDER BY created_at DESC')
    .all();
  if (new URL(context.request.url).searchParams.get('export') === 'csv') {
    const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const csv = ['email,created_at', ...(results || []).map((r) => `${esc(r.email)},${esc(r.created_at)}`)].join('\n');
    return new Response(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="newsletter-subscribers.csv"',
      },
    });
  }
  return json({ subscribers: results || [] });
}

export async function onRequestPost(context) {
  const ip = context.request.headers.get('CF-Connecting-IP') || 'local';
  if (!rateLimit(`newsletter:${ip}`, 5, 60_000)) return bad('Too many requests, please slow down.', 429);

  const { email } = await readJson(context.request);
  const value = String(email || '').trim().toLowerCase().slice(0, 254);
  if (!EMAIL_RE.test(value)) return bad('Please enter a valid email address.');

  const res = await context.env.DB
    .prepare('INSERT OR IGNORE INTO newsletter (email) VALUES (?)')
    .bind(value)
    .run();
  const inserted = res?.meta?.changes === 1;

  // Same public responses the old localStorage UI showed (already / welcome).
  return json({ ok: true, message: inserted ? 'welcome' : 'already' }, { status: inserted ? 201 : 200 });
}

