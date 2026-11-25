// Tiny fetch client for the /api/* Functions. Same-origin (Cloudflare Pages),
// so cookies ride along automatically.
const inflight = new Map();
const REQUEST_TIMEOUT_MS = 30_000;

export async function api(path, { method = 'GET', body, signal, headers: extraHeaders } = {}) {
  const headers = {
    ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    ...(extraHeaders || {}),
  };
  const key = `${method} ${path} ${body ? JSON.stringify(body) : ''} ${JSON.stringify(headers)}`;
  if (method === 'GET' && inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort(signal?.reason);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(path, {
        method,
        headers: Object.keys(headers).length ? headers : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        credentials: 'same-origin',
        // API responses are validated by the Functions rather than browser cache.
        cache: 'no-store',
        signal: controller.signal,
      });
      if (res.status === 304) {
        return { notModified: true, etag: res.headers.get('etag') };
      }
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
    }
    catch (error) {
      if (timedOut) {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
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
