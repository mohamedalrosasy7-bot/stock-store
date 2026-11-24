// Session guard + cookie helpers for admin-only endpoints.
import { COOKIE_NAME, verifySession, newSessionToken } from './util.js';

export { COOKIE_NAME, verifySession, newSessionToken };

export function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

// Max-Age=0 clears the cookie (logout).
// `Secure` is only added on https — local `pages dev` runs on plain http.
export function sessionCookie(token, maxAgeSec = 7 * 24 * 3600, secure = true) {
  const base = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`;
  return secure ? `${base}; Secure` : base;
}

// Returns the signed session payload (sub/email) or null when not logged in.
export async function requireAdmin(context) {
  const token = getCookie(context.request, COOKIE_NAME);
  return token ? verifySession(context.env, token) : null;
}
