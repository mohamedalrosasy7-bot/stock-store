// Shared helpers for all /api/* endpoints.

export const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) },
  });

export const bad = (message, status = 400) => json({ error: message }, { status });

const encoder = new TextEncoder();

// --- PBKDF2 password hashing (Web Crypto — works on Workers, no deps) ---
const PBKDF2_ITERATIONS = 100000;

export async function hashPassword(password, saltHex = null) {
  const salt = saltHex
    ? hexToBytes(saltHex)
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, , saltHex, hashHex] = String(stored).split('$');
    if (scheme !== 'pbkdf2') return false;
    const candidate = await hashPassword(password, saltHex);
    return candidate === stored;
  } catch {
    return false;
  }
}

const hexToBytes = (hex) => new Uint8Array((hex.match(/.{2}/g) || []).map((h) => parseInt(h, 16)));
const bytesToHex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

// --- Signed session cookie (HMAC-SHA256) ---
// Value format: base64url(payload).base64url(hmac)
export const COOKIE_NAME = 'mv_session';

export async function newSessionToken(env, { sub, email }) {
  const payload = { sub, email, iat: Date.now() };
  const b64 = base64url(JSON.stringify(payload));
  const sig = await hmac(env, b64);
  return `${b64}.${sig}`;
}

export async function verifySession(env, token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [b64, sig] = token.split('.');
  if (!b64 || !sig) return null;
  const expected = await hmac(env, b64);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64urlDecode(b64)));
  } catch {
    return null;
  }
}

async function hmac(env, data) {
  // SESSION_SECRET must be set via `wrangler secret` in production.
  const secret = (env && env.SESSION_SECRET) || 'dev-only-secret';
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64url(new Uint8Array(sig));
}

// Accepts a string (already-encoded text) or a byte array.
const base64url = (data) =>
  btoa(typeof data === 'string' ? data : String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const base64urlDecode = (s) => new Uint8Array([...atob(s.replace(/-/g, '+').replace(/_/g, '/'))].map((c) => c.charCodeAt(0)));

// --- Request helpers ---
export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

// Very small per-isolate rate limiter (best-effort; D1 + edge make real limiting hard).
const attempts = new Map();

export function rateLimit(key, max = 5, windowMs = 60_000) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.at > windowMs) {
    attempts.set(key, { at: now, n: 1 });
    return true;
  }
  entry.n += 1;
  return entry.n <= max;
}
