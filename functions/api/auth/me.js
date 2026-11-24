// GET /api/auth/me — used by the storefront to know if an admin session is alive.
import { json } from '../../_lib/util.js';
import { requireAdmin } from '../../_lib/auth.js';

export async function onRequestGet(context) {
  const admin = await requireAdmin(context);
  if (!admin) return json({ admin: null }, { status: 401 });
  return json({ admin: { email: admin.email } });
}
