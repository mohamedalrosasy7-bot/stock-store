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

1. Create a D1 database named `stock-store-db`, then put its ID in `wrangler.toml` under the `DB` binding.
2. Apply `schema.sql` to the database and initialize the starter settings/categories with `node scripts/seed.mjs --remote` after setting the intended environment values.
3. Create a Cloudflare Pages project named `stock-store` and connect this repository or deploy it with Wrangler. GitHub Pages serves static files only and cannot run the Functions in `functions/`.
4. In Cloudflare Pages, bind D1 as `DB`. Add the runtime secrets `SESSION_SECRET`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`, plus the variable `CLOUDINARY_CLOUD_NAME`.
5. Set `VITE_CLOUDINARY_CLOUD_NAME` in the Pages build environment so the browser can generate optimized Cloudinary URLs.

The repository's current GitHub Pages workflow publishes the frontend but does not deploy a backend runtime. The Cloudflare account, D1 database ID, and Cloudinary credentials still need to be supplied before production orders, admin changes, and image uploads can persist.

## Store configuration

Edit `src/config.js` for the store name, currency, WhatsApp number, contact details, delivery fee and free-delivery threshold. The API independently recalculates order prices and delivery charges; keep its delivery values in `functions/api/orders/index.js` aligned with the storefront settings.

Edit `src/data/products.js` for the fallback catalog. The remote D1 catalog is the source of truth when the API is available. `scripts/seed.mjs` initializes categories and settings; it intentionally does not import the fallback product catalog.

## Notes

- Admin sessions use signed, HTTP-only cookies. Set `SESSION_SECRET` to a random value of at least 32 characters.
- Never commit `.dev.vars` or Cloudinary credentials. `.dev.vars.example` contains placeholders only.
- The application is a client-rendered SPA. Product photos in the fallback catalog are linked from Unsplash.
