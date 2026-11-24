// POST /api/upload — admin: signed upload to Cloudinary (the API secret never
// reaches the browser; the browser sends the raw file, we sign and forward).
// DELETE /api/upload — admin: remove an image from Cloudinary by URL.
import { json, bad, readJson } from '../_lib/util.js';
import { requireAdmin } from '../_lib/auth.js';

export async function onRequestPost(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const env = context.env;

  const cloud = env.CLOUDINARY_CLOUD_NAME;
  const key = env.CLOUDINARY_API_KEY;
  const secret = env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return bad('Cloudinary is not configured.', 500);

  const form = await context.request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return bad('file field is required.');
  if (file.size > 8 * 1024 * 1024) return bad('Max image size is 8MB.');
  if (!/^image\/(jpeg|png|webp|gif|avif)$/i.test(file.type || '')) {
    return bad('Only JPEG, PNG, WebP, GIF or AVIF images are allowed.');
  }

  const folder = env.CLOUDINARY_FOLDER || 'stock-store';
  // Predictable public_id (folder + timestamp + cleaned filename) so the asset
  // can later be deleted by URL when the admin removes an image.
  const name = String(file.name || 'image')
    .replace(/\.[^.]*$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .slice(0, 40) || 'image';
  const publicId = `${folder}/${Date.now().toString(36)}-${name}`;
  const timestamp = Math.floor(Date.now() / 1000);

  // Cloudinary signature: sha1 of sorted params + api_secret
  const params = { folder, public_id: publicId, timestamp };
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&') + secret;
  const signature = await sha1Hex(toSign);

  const upstream = new FormData();
  upstream.append('file', file, file.name || 'upload');
  upstream.append('api_key', key);
  upstream.append('timestamp', String(timestamp));
  upstream.append('folder', folder);
  upstream.append('public_id', publicId);
  upstream.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    body: upstream,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) return bad(data?.error?.message || 'Cloudinary upload failed.', 502);

  return json({
    ok: true,
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    // Same asset resized on demand for lists/thumbnails.
    thumbnail: data.secure_url.replace('/upload/', '/upload/w_400,c_limit,q_auto,f_auto/'),
  });
}

export async function onRequestDelete(context) {
  if (!(await requireAdmin(context))) return bad('Unauthorized.', 401);
  const env = context.env;

  const cloud = env.CLOUDINARY_CLOUD_NAME;
  const key = env.CLOUDINARY_API_KEY;
  const secret = env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return bad('Cloudinary is not configured.', 500);

  const { url } = await readJson(context.request);
  const publicId = publicIdFromUrl(url, cloud);
  if (!publicId) return bad('A valid Cloudinary image URL is required.');

  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `public_id=${publicId}&timestamp=${timestamp}` + secret;
  const signature = await sha1Hex(toSign);
  const form = new FormData();
  form.append('public_id', publicId);
  form.append('api_key', key);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  // result is "ok" on success, "not found" when the id no longer exists.
  return json({ ok: res.ok && data.result === 'ok', result: data.result || null });
}

// Extracts "<folder>/<file>" from a delivery URL. Uploads always carry the
// "stock-store" (or configured) folder, so keeping the last two path segments
// maps the URL back to the exact public_id we generated on upload.
function publicIdFromUrl(url, cloud) {
  if (typeof url !== 'string') return null;
  const m = url.match(new RegExp(`^https://res\\.cloudinary\\.com/${cloud}/image/upload/(?:[^/?#]+/)?(.+?)(?:\\.[a-zA-Z0-9]+)?(?:[?#].*)?$`));
  if (!m) return null;
  const segments = decodeURIComponent(m[1]).split('/').filter(Boolean);
  if (!segments.length) return null;
  // Drop a leading version segment (v1234567890) if present.
  if (/^v\d+$/.test(segments[0])) segments.shift();
  return segments.slice(-2).join('/');
}

async function sha1Hex(text) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
