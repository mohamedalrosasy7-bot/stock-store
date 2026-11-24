import { go, sleep, txt, txtAll, count, exists, smartClick, clickByText, clickNth, type, setInput, attr, hash, lsGet, BASE } from './lib.mjs';

export default async function t1({ page, results, ok }) {
  const err0 = page._errors.length;

  // ---- First load: Arabic / RTL by default ----
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.querySelector('.splash'), { timeout: 8000 }).catch(() => {});
  await sleep(600);
  ok('home: default lang = ar', (await page.evaluate(() => document.documentElement.lang)) === 'ar');
  ok('home: default dir = rtl', (await page.evaluate(() => document.documentElement.dir)) === 'rtl');
  ok('home: hero image rendered', await exists(page, '.hero-media-main'));
  ok('home: 5 category tiles (default)', (await count(page, '.cat-tile')) === 5);
  ok('home: AR tile name أحذية', (await txtAll(page, '.cat-tile-title')).includes('أحذية'));
  ok('home: footer logo exists', await exists(page, '.footer-logo'));
  const wa = await attr(page, '.whatsapp', 'href');
  ok('home: whatsapp float link', !!wa && wa.startsWith('https://wa.me/'));
  ok('home: topbar shows free-shipping', (await txt(page, '.topbar')).includes('2,500'));

  // ---- Language switch to EN ----
  await page.evaluate(() => localStorage.setItem('mv-lang', 'en'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(800);
  ok('lang: switched to en/ltr', (await page.evaluate(() => document.documentElement.lang)) === 'en'
    && (await page.evaluate(() => document.documentElement.dir)) === 'ltr');
  ok('lang: hero h1 EN', ((await txt(page, '.hero h1')) || '').includes('THIS IS YOUR STYLE'));

  // ---- Theme toggle ----
  await smartClick(page, '.nav-actions button[aria-label="Switch to dark mode"]');
  await sleep(250);
  ok('theme: dark applied', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
  await smartClick(page, '.nav-actions button[aria-label="Switch to light mode"]');
  await sleep(250);
  ok('theme: back to light', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light');

  // ---- Hero CTAs ----
  await clickByText(page, '.hero-actions a', 'Shop Now');
  await sleep(600);
  ok('hero: Shop Now -> /shop', (await hash(page)) === '#/shop');
  await go(page, '/');
  await clickByText(page, '.hero-actions a', 'New Arrivals');
  await sleep(600);
  ok('hero: New Arrivals -> sort=newest', (await hash(page)).includes('/shop?sort=newest'));

  // ---- Navbar search ----
  await go(page, '/');
  await smartClick(page, '.nav-actions button[aria-label="Search"]');
  await sleep(300);
  ok('nav: search panel opens', await exists(page, '.search-panel input'));
  await type(page, '.search-panel input', 'Chelsea');
  await smartClick(page, '.search-panel button[type="submit"]');
  await sleep(800);
  ok('nav: search navigates to q=Chelsea', (await hash(page)).includes('/shop?q=Chelsea'));
  ok('nav: search finds 1 product', (await count(page, '.card')) === 1);
  ok('nav: result is Chelsea Boots', ((await txtAll(page, '.card-title')) || []).includes('Chelsea Boots'));

  // ---- Category tile -> shop filter ----
  await go(page, '/');
  await clickByText(page, '.cat-tile', 'Shoes');
  await sleep(800);
  ok('tile: Shoes -> category=shoes', (await hash(page)).includes('/shop?category=shoes'));
  ok('tile: 7 shoes products', (await count(page, '.card')) === 7);
  ok('tile: results count text', ((await txt(page, '.results-count')) || '').includes('7'));

  // ---- Quick category chips + filter drawer (category, price, sale) ----
  await clickByText(page, '.quick-category-chip', 'All');
  await sleep(700);
  ok('chips: All -> 16 products', (await count(page, '.card')) === 16);
  await smartClick(page, '.filter-toggle'); // open the drawer (inputs are hidden otherwise)
  await sleep(500);
  await setInput(page, '.range input[aria-label="Min"]', '2000');
  await sleep(700);
  ok('filters: min 2000 leaves 9 (eff. price)', (await count(page, '.card')) === 9, await txt(page, '.results-count'));
  await clickByText(page, '.filters button', 'Clear all filters');
  await sleep(700);
  ok('filters: clear all -> 16 products', (await count(page, '.card')) === 16);
  await setInput(page, '.range input[aria-label="Min"]', '99999');
  await sleep(700);
  ok('filters: impossible range -> empty state', await exists(page, '.empty'));
  await clickByText(page, '.empty button', 'Clear filters');
  await sleep(400);
  // First click may only close the open filters drawer (ghost-click guard) — click again.
  await clickByText(page, '.empty button', 'Clear filters');
  await sleep(700);
  ok('filters: empty-state clear -> 16', (await count(page, '.card')) === 16);
  await smartClick(page, '.filters .filter-sale-card input');
  await sleep(700);
  ok('filters: sale-only = 8', (await count(page, '.card')) === 8, await txt(page, '.results-count'));
  await clickByText(page, '.filters button', 'Clear all filters');
  await sleep(600);

  // ---- Wishlist heart + toast ----
  await smartClick(page, '.card .wish');
  await sleep(500);
  ok('wish: toast shown', await exists(page, '.toast.wishlist'));
  ok('wish: navbar badge = 1', (await txt(page, 'a[href="#/wishlist"] .count')) === '1');
  await go(page, '/wishlist');
  ok('wish: page shows 1 item', (await count(page, '.card')) === 1);
  await smartClick(page, '.card .wish');
  await sleep(500);
  ok('wish: removed -> empty state', await exists(page, '.empty'));

  // ---- Newsletter ----
  await type(page, '.newsletter-row input', 'not-an-email');
  await smartClick(page, '.newsletter-row button');
  await sleep(300);
  ok('newsletter: invalid email error', ((await txt(page, '.form-msg.error')) || '').length > 3);
  const newsletterEmail = `e2e-${process.env.E2E_RUN_ID || Date.now()}@example.test`;
  const newsletterResponse = () => page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/newsletter' && response.request().method() === 'POST'
  );
  const firstSubscribe = newsletterResponse();
  await type(page, '.newsletter-row input', newsletterEmail);
  await smartClick(page, '.newsletter-row button');
  const firstResponse = await firstSubscribe;
  const firstData = await firstResponse.json();
  await sleep(300);
  ok('newsletter: welcome on subscribe', firstResponse.status() === 201 && firstData.message === 'welcome'
    && ((await txt(page, '.form-msg.success')) || '').includes('Welcome'));
  const duplicateSubscribe = newsletterResponse();
  await type(page, '.newsletter-row input', newsletterEmail);
  await smartClick(page, '.newsletter-row button');
  const duplicateResponse = await duplicateSubscribe;
  const duplicateData = await duplicateResponse.json();
  await sleep(300);
  ok('newsletter: duplicate detected', duplicateResponse.status() === 200 && duplicateData.message === 'already'
    && ((await txt(page, '.form-msg.info')) || '').includes('already'));
  ok('newsletter: persisted in D1', firstResponse.status() === 201 && duplicateResponse.status() === 200);

  // ---- 404 ----
  await go(page, '/no-such-page');
  ok('404: page renders', ((await txt(page, '.empty h1')) || '').includes("doesn't exist"));
  await clickByText(page, '.empty a', 'Back to the shop');
  await sleep(600);
  ok('404: back-to-shop works', (await hash(page)) === '#/shop');

  const errs = page._errors.slice(err0);
  ok('t1: zero console/page errors', errs.length === 0, errs.join(' || ').slice(0, 300));
}
