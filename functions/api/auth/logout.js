// POST /api/auth/logout — clears the session cookie.
import { json } from '../../_lib/util.js';
import { sessionCookie } from '../../_lib/auth.js';

export async function onRequestPost(context) {
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie('', 0) } });
}
