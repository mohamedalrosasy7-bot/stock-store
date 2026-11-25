import { json, bad } from '../../_lib/util.js';
import { readCatalogVersion, readStorefrontSnapshot } from '../../_lib/storefront.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const requestedVersion = url.searchParams.get('version');
  if (!requestedVersion || !/^\d+$/.test(requestedVersion)) return bad('A catalog version is required.');

  const currentVersion = await readCatalogVersion(env.DB);
  if (currentVersion !== requestedVersion) {
    return json({ error: 'Catalog changed. Check the version and retry.', version: currentVersion }, { status: 409 });
  }

  const cacheKey = new Request(`${url.origin}/api/storefront/catalog?version=${requestedVersion}`);
  let cache;
  let cacheUnavailableReason;
  try {
    cache = caches.default;
  } catch (error) {
    cacheUnavailableReason = error?.message;
  }
  if (!cache) {
    console.warn('Cloudflare Cache API is unavailable; building the snapshot from D1.', cacheUnavailableReason);
  }
  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    } catch (error) {
      console.warn('Could not read the storefront cache:', error?.message);
    }
  }

  const snapshot = await readStorefrontSnapshot(env.DB);
  if (snapshot.version !== requestedVersion) {
    return json({ error: 'Catalog changed. Check the version and retry.', version: snapshot.version }, { status: 409 });
  }

  const response = json(snapshot, {
    headers: {
      etag: `"${snapshot.version}"`,
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
  if (cache) {
    try {
      context.waitUntil(cache.put(cacheKey, response.clone()).catch((error) => {
        console.error('Could not cache the storefront snapshot:', error?.message);
      }));
    } catch (error) {
      console.error('Could not cache the storefront snapshot:', error?.message);
    }
  }
  return response;
}
