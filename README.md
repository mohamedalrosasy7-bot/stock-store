# STOCK STORE

React storefront built with Vite and Cloudflare Pages Functions. Product, category, ad, settings, order, and newsletter data are stored in Cloudflare D1. Product images are uploaded through the Functions API to Cloudinary.

## Local development

Requires Node.js 20.19+ and npm.

```bash
npm install
Copy-Item .dev.vars.example .dev.vars
# Replace the example values in .dev.vars with local development values.
npm run build
npx wrangler pages dev dist --compatibility-date=2024-09-23
```

`npm run dev` starts Vite only; it does not run the `/api/*` Pages Functions. Use `wrangler pages dev` when working on the API or admin persistence. Configure a local D1 database binding in `wrangler.toml` before using the Functions locally.

## Cloudflare backend setup

1. Create a D1 database named `stock-store-db`, then put its ID in `wrangler.toml` under the `DB` binding. Replace the Cloudinary cloud-name placeholder in the same file.
2. Apply `schema.sql` to the database with `npx wrangler d1 execute stock-store-db --remote --file=schema.sql`.
3. Create a Cloudflare Pages project named `stock-store`. GitHub Pages serves static files only and cannot run the Functions in `functions/`.
4. In Cloudflare Pages, bind D1 as `DB`. Add the runtime secrets `SESSION_SECRET`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
5. Add GitHub repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; add the repository variable `VITE_CLOUDINARY_CLOUD_NAME` so the browser can generate optimized Cloudinary URLs.
6. After the Pages project, D1 binding, and secrets are ready, set the GitHub repository variable `CLOUDFLARE_DEPLOY_ENABLED` to `true`. The workflow stays paused until this final switch.

The Cloudflare account, D1 database ID, and Cloudinary credentials still need to be supplied before production orders, admin changes, and image uploads can persist. The GitHub Actions deployment workflow has been prepared but remains paused until account setup is complete. A fresh D1 database has no products; add them through the admin catalog or perform a deliberate catalog import.

## Store configuration

Edit `src/config.js` for the store name, currency, WhatsApp number, contact details, delivery fee and free-delivery threshold. The API independently recalculates order prices and delivery charges; keep its delivery values in `functions/api/orders/index.js` aligned with the storefront settings.

Edit `src/data/products.js` for the fallback catalog. The remote D1 catalog is the source of truth when the API is available. `scripts/seed.mjs` initializes categories and settings; it intentionally does not import the fallback product catalog. Data saved by older versions in a browser's localStorage is not automatically copied into D1.

## Notes

- Admin sessions use signed, HTTP-only cookies. Set `SESSION_SECRET` to a random value of at least 32 characters.
- Never commit `.dev.vars` or Cloudinary credentials. `.dev.vars.example` contains placeholders only.
- The application is a client-rendered SPA. Product photos in the fallback catalog are linked from Unsplash.
