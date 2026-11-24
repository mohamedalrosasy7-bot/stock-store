// POST /api/auth/login — { email, password } -> session cookie
import { json, bad, readJson, hashPassword, verifyPassword, rateLimit } from '../../_lib/util.js';
import { newSessionToken, sessionCookie } from '../../_lib/auth.js';

export async function onRequestPost(context) {
  const ip = context.request.headers.get('CF-Connecting-IP') || 'local';
  if (!rateLimit(`login:${ip}`, 8, 60_000)) return bad('Too many attempts, try again in a minute.', 429);

  const { email, password } = await readJson(context.request);
  if (!email || !password) return bad('Email and password are required.');

  const row = await context.env.DB
    .prepare('SELECT id, email, password_hash FROM admins WHERE email = ?')
    .bind(String(email).trim().toLowerCase())
    .first();

  const ok = row && (await verifyPassword(String(password), row.password_hash));
  if (!ok) return bad('Invalid email or password.', 401);

  const token = await newSessionToken(context.env, { sub: row.id, email: row.email });
  const secure = new URL(context.request.url).protocol === 'https:';
  return json({ ok: true, admin: { email: row.email } }, { headers: { 'set-cookie': sessionCookie(token, undefined, secure) } });
}
