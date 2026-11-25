import { json } from '../../_lib/util.js';
import { readCatalogVersion } from '../../_lib/storefront.js';

export async function onRequestGet({ request, env }) {
  const version = await readCatalogVersion(env.DB);
  const etag = `"${version}"`;
  const headers = { etag, 'cache-control': 'no-store' };
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers });
  }
  return json({ version }, { headers });
}
