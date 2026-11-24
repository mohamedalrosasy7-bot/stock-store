// Tiny fetch client for the /api/* Functions. Same-origin (Cloudflare Pages),
// so cookies ride along automatically.
const inflight = new Map();

export async function api(path, { method = 'GET', body, signal } = {}) {
  const key = `${method} ${path} ${body ? JSON.stringify(body) : ''}`;
  if (method === 'GET' && inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    const res = await fetch(path, {
      method,
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      // Always talk to the Functions: D1 is the source of truth and admin edits
      // must show up instantly. React state is the instant-render cache.
      cache: 'no-store',
      signal,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON error page */
    }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  })();

  if (method === 'GET') {
    inflight.set(key, promise);
    promise.finally(() => inflight.delete(key)).catch(() => {});
  }
  return promise;
}

// Multipart upload through the authenticated Pages Function. Cloudinary's
// unsigned preset is applied server-side; no API secret reaches the browser.
export async function uploadImage(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data && data.error) || `Upload failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Removes a Cloudinary-hosted image when an admin deletes it. Best-effort:
// legacy base64 / external URLs are simply ignored.
export async function deleteImage(url) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com/')) return false;
  try {
    await api('/api/upload', { method: 'DELETE', body: { url } });
    return true;
  } catch {
    return false;
  }
}
