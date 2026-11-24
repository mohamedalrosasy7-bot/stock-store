// POST /api/auth/password — { current, next } (logged-in admin only).
import { json, bad, readJson, hashPassword, verifyPassword } from '../../_lib/util.js';
import { requireAdmin } from '../../_lib/auth.js';

export async function onRequestPost(context) {
  const admin = await requireAdmin(context);
  if (!admin) return bad('Unauthorized.', 401);

  const { current, next } = await readJson(context.request);
  if (!current || !next || String(next).length < 8) return bad('New password must be at least 8 characters.');

  const row = await context.env.DB
    .prepare('SELECT password_hash FROM admins WHERE id = ?')
    .bind(admin.sub)
    .first();
  if (!row || !(await verifyPassword(String(current), row.password_hash))) {
    return bad('Current password is incorrect.', 403);
  }

  await context.env.DB
    .prepare('UPDATE admins SET password_hash = ? WHERE id = ?')
    .bind(await hashPassword(String(next)), admin.sub)
    .run();

  return json({ ok: true });
}
