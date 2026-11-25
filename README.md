# STOCK STORE

React storefront built with Vite and Cloudflare Pages Functions. Product, category, ad, settings, order, and newsletter data are stored in Cloudflare D1. Admin images are uploaded through the authenticated Functions API to Cloudinary using an unsigned upload preset.

## Local development

Requires Node.js 20.19+ and npm.

```bash
npm install
Copy-Item .dev.vars.example .dev.vars
# Replace the example values in .dev.vars with local development values.
npm run build
npx wrangler pages dev dist --compatibility-date=2024-09-23
```

Run the command above in one terminal; Pages Functions listen on port `8788`. In a second terminal, run `npm run dev` to serve the Vite frontend on port `5173`; Vite proxies `/api/*` to the Pages Functions server. Apply the current schema to local D1 with `npx wrangler d1 execute stock-store-db --local --file=schema.sql`, and reapply it whenever the schema changes. `npm run dev` by itself does not run the API.

## Production deployment status

The production storefront is deployed at <https://stock-store.pages.dev> using Cloudflare Pages Functions and the remote D1 database `stock-store-db`. The database ID and `DB` binding are recorded in `wrangler.toml`. Before deploying catalog code that uses versioned caching, apply the current schema to the target database with `npx wrangler d1 execute stock-store-db --remote --file=schema.sql`. The database currently contains the sample catalog from `seed.json` (16 products and 5 categories). These are starter/test records and should be reviewed or replaced before treating the store as live inventory.

Cloudflare Pages production secrets are configured for `SESSION_SECRET`, `CLOUDINARY_UPLOAD_PRESET`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. The public Cloudinary cloud name is in `wrangler.toml`. Uploads use the unsigned preset through the authenticated Pages Function; image deletion uses the signed Cloudinary API.

Two admin accounts are configured in production D1. Passwords are stored as salted PBKDF2 hashes and are not included in the repository or deployment files. The initial admin setup is intentionally kept out of the sample catalog seed script.

The site was deployed directly with Wrangler. To enable future GitHub Actions deployments, add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets, then set the repository variable `CLOUDFLARE_DEPLOY_ENABLED` to `true`. The workflow stays paused until that variable is enabled. The storefront's Cloudinary cloud name can be overridden with the optional variable `VITE_CLOUDINARY_CLOUD_NAME`.

For a new environment, create a D1 database and a Pages project named `stock-store`, set the D1 binding as `DB`, apply `schema.sql`, then add the Pages secrets listed above. Do not run `scripts/seed.mjs` without explicitly setting admin credentials: that legacy script creates an admin account. Use `node scripts/seed-catalog.mjs --remote` only when intentionally loading the sample catalog.

## Store configuration

Edit `src/config.js` for the store name, currency, WhatsApp number, contact details, delivery fee and free-delivery threshold. The API independently recalculates order prices and delivery charges; keep its delivery values in `functions/api/orders/index.js` aligned with the storefront settings.

Edit `src/data/products.js` for the fallback catalog. The remote D1 catalog is the source of truth when the API is available. `scripts/seed.mjs` initializes categories and settings; it intentionally does not import the fallback product catalog. Data saved by older versions in a browser's localStorage is not automatically copied into D1.

The public storefront keeps a catalog snapshot in IndexedDB and checks its ETag on startup and when the page regains focus. A one-row D1 version check avoids downloading the full catalog unless it changed; the full public snapshot is also cached in Cloudflare's Cache API under its versioned URL. D1 triggers in `schema.sql` increment the catalog version atomically with product, category, ad, and storefront-setting writes, including seed scripts and direct SQL changes. Applying the schema also bumps the version once to invalidate snapshots from earlier catalog implementations, so apply it before deploying this cache implementation. Cache API entries are regional to a Cloudflare data center, so a cold region or an evicted entry may rebuild that snapshot from D1. Admin data and authentication APIs remain `no-store`; image files stay on Cloudinary and use normal browser/CDN caching.

## Notes

- Admin sessions use signed, HTTP-only cookies. Set `SESSION_SECRET` to a random value of at least 32 characters.
- Never commit `.dev.vars` or Cloudinary API credentials. The example file contains placeholders for secrets and the public unsigned upload settings.
- Treat the unsigned upload preset name as sensitive. Restrict allowed formats and upload behavior in Cloudinary; use signed uploads if you need stronger upload authorization.
- The application is a client-rendered SPA. Product photos in the fallback catalog are linked from Unsplash.
