import { go, sleep, txt, txtAll, count, exists, smartClick, clickByText, clickNth, type, attr, hash, lsGet, selectNth, loginAdmin } from './lib.mjs';

import { fileURLToPath } from 'node:url';
const FIXTURE = fileURLToPath(new URL('./upload.png', import.meta.url));

const rowAction = (page, name, kind) => page.evaluate(({ name, kind }) => {
  const rows = [...document.querySelectorAll('.admin-table tbody tr')];
  const row = rows.find((r) => r.innerText.includes(name));
  if (!row) return 'no-row';
  const btn = row.querySelector(kind);
  if (!btn) return 'no-btn';
  btn.click();
  return 'clicked';
}, { name, kind });

const returnToProductList = async (page) => {
  await page.waitForFunction(() => /^#\/admin\/products$/.test(location.hash)
    || !!document.querySelector('.admin-toast--success'), { timeout: 8000 });
  await go(page, '/admin/products');
  await page.waitForSelector('.admin-search input', { timeout: 5000 });
};

export default async function t4({ page, results, ok }) {
  const err0 = page._errors.length;

  // ---- Products list & filters ----
  // Authenticate through the real login flow so API calls use a valid session cookie.
  await loginAdmin(page);
  await go(page, '/admin/products');
  await sleep(900);
  ok('adm-products: 16 rows', (await count(page, '.admin-table tbody tr')) === 16);
  await type(page, '.admin-search input', 'Chelsea');
  await sleep(500);
  ok('adm-products: search -> 1 row', (await count(page, '.admin-table tbody tr')) === 1);
  await clickByText(page, '.admin-clear-filters', 'Clear');
  await sleep(400);
  await selectNth(page, '.admin-toolbar-filters .admin-select', 0, 'shoes');
  await sleep(500);
  ok('adm-products: category shoes = 7', (await count(page, '.admin-table tbody tr')) === 7);
  await selectNth(page, '.admin-toolbar-filters .admin-select', 1, 'price-asc');
  await sleep(500);
  const firstName = await page.$eval('.admin-table tbody tr .admin-table-name', (e) => e.innerText.trim());
  ok('adm-products: price asc -> Court Sneakers first', firstName === 'Court Sneakers', firstName);
  await page.click('.admin-toolbar-filters input[type="checkbox"]');
  await sleep(500);
  ok('adm-products: sale-only shoes = 3', (await count(page, '.admin-table tbody tr')) === 3);
  await clickByText(page, '.admin-clear-filters', 'Clear');
  await sleep(500);
  ok('adm-products: cleared -> 16', (await count(page, '.admin-table tbody tr')) === 16);

  // ---- Create product (empty submit first) ----
  await go(page, '/admin/products/add');
  await sleep(800);
  await smartClick(page, '.admin-form-actions button[type="submit"]');
  await sleep(500);
  ok('adm-form: validation errors shown', (await count(page, '.admin-field-error')) >= 2);
  ok('adm-form: description & images are optional (no error for them)', (await count(page, '.admin-field-error')) === 2);
  await type(page, 'input[placeholder="e.g. Essential Oversized Tee"]', 'E2E Product Alpha');
  await type(page, '.admin-form textarea', 'Hard-test product created by the E2E suite.');
  const nums = await page.$$('.admin-form-grid input[type="number"]');
  await nums[0].type('500');
  await nums[1].type('10');
  await sleep(400);
  ok('adm-form: final price preview 450', ((await txt(page, '.admin-preview-price')) || '').includes('450'));
  await clickByText(page, '.admin-form button', 'Add Color');
  await sleep(300);
  ok('adm-form: color added -> 2 rows', (await count(page, '.admin-color-row')) === 2);
  await page.evaluate(() => [...document.querySelectorAll('.admin-color-row .admin-icon-btn')].pop().click());
  await sleep(300);
  ok('adm-form: color removed -> 1 row', (await count(page, '.admin-color-row')) === 1);
  // The form holds several file inputs (one per color + the main images one,
  // rendered last). Grab the LAST one so the upload lands in form.images.
  const fileInputs = await page.$$('.admin-form input[type="file"]');
  await fileInputs[fileInputs.length - 1].uploadFile(FIXTURE);
  await page.waitForSelector('.admin-image-item', { timeout: 10000 }).catch(() => {});
  ok('adm-form: image uploaded', (await count(page, '.admin-image-item')) === 1);
  await smartClick(page, '.admin-form-actions button[type="submit"]');
  // The form navigates ~900ms after a successful save; wait for the *list* route
  // (not "/add", which also contains "/admin/products") and for the list to render.
  await returnToProductList(page);
  await sleep(400);
  await type(page, '.admin-search input', 'E2E Product Alpha');
  await sleep(500);
  ok('adm-form: new product listed', (await count(page, '.admin-table tbody tr')) === 1);

  // ---- Storefront reflects created product ----
  await go(page, '/shop?q=E2E Product Alpha');
  await sleep(900);
  ok('storefront: new product visible', (await count(page, '.card')) === 1);
  ok('storefront: -10% badge', (await txt(page, '.card .badge-sale')) === '-10%');
  await smartClick(page, '.card-title');
  await sleep(900);
  ok('storefront: PDP price 450', ((await txt(page, '.pdp-info .price .now')) || '').includes('450'));

  // Wishlist toggle on admin-created product (uses live catalog, not static PRODUCTS)
  await go(page, '/shop?q=E2E Product Alpha');
  await sleep(800);
  await smartClick(page, '.card .wish');
  await sleep(500);
  const wishLs = await lsGet(page, 'mv-wishlist');
  ok('storefront: admin-created product can be wishlisted', (wishLs || '').includes('e2e-product-alpha'), `mv-wishlist=${wishLs}`);

  // ---- Edit product ----
  await go(page, '/admin/products');
  await sleep(700);
  await type(page, '.admin-search input', 'E2E Product Alpha');
  await sleep(400);
  await rowAction(page, 'E2E Product Alpha', 'a.admin-icon-btn');
  await sleep(900);
  ok('adm-edit: form loaded with name', (await page.$eval('input[placeholder="e.g. Essential Oversized Tee"]', (i) => i.value)) === 'E2E Product Alpha');
  // ElementHandle must be passed as a direct evaluate() arg (nested in an object it
  // gets cloned, and calling the native value setter on the clone throws "Illegal invocation").
  const setNative = (el, val) => page.evaluate((e, v) => {
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    s.call(e, v);
    e.dispatchEvent(new Event('input', { bubbles: true }));
  }, el, val);
  const nums2 = await page.$$('.admin-form-grid input[type="number"]');
  await setNative(nums2[0], '600');
  await setNative(nums2[1], '');
  const sels = await page.$$('.admin-form-grid select');
  await sels[1].select('winter');
  await sleep(300);
  await smartClick(page, '.admin-form-actions button[type="submit"]');
  await returnToProductList(page);
  await sleep(400);
  await go(page, '/shop?q=E2E Product Alpha');
  await sleep(900);
  ok('adm-edit: price 600, discount removed', ((await txt(page, '.card .price .now')) || '').includes('600') && !(await exists(page, '.card .badge-sale')));

  // ---- Season visibility toggle (winter) ----
  await go(page, '/admin/products');
  await sleep(800);
  await clickNth(page, '.admin-season-action', 0);
  await sleep(600);
  const seasonData = await page.evaluate(async () => (await fetch('/api/settings')).json());
  const winterHidden = seasonData.settings?.hiddenSeasons?.winter === true;
  await go(page, '/shop?q=E2E Product Alpha');
  await sleep(900);
  ok('season: winter product hidden from storefront', winterHidden && (await exists(page, '.empty')));
  await go(page, '/admin/products');
  await sleep(800);
  await clickNth(page, '.admin-season-action', 0);
  await sleep(600);
  await go(page, '/shop?q=E2E Product Alpha');
  await sleep(900);
  ok('season: winter product visible again', (await count(page, '.card')) === 1);

  // ---- Active toggle (hide/show) ----
  await go(page, '/admin/products');
  await sleep(700);
  await type(page, '.admin-search input', 'E2E Product Alpha');
  await sleep(400);
  await rowAction(page, 'E2E Product Alpha', '.admin-cell-actions button.admin-icon-btn:not(.danger)');
  await sleep(600);
  const pill = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.admin-table tbody tr')];
    const row = rows.find((r) => r.innerText.includes('E2E Product Alpha'));
    return row ? row.querySelector('.admin-status')?.className || '' : 'no-row';
  });
  ok('adm-toggle: status pill = Hidden', String(pill).includes('hidden'), pill);
  await go(page, '/shop?q=E2E Product Alpha');
  await sleep(900);
  ok('adm-toggle: hidden product gone from storefront', await exists(page, '.empty'));
  await go(page, '/admin/products');
  await sleep(700);
  await type(page, '.admin-search input', 'E2E Product Alpha');
  await sleep(400);
  await rowAction(page, 'E2E Product Alpha', '.admin-cell-actions button.admin-icon-btn:not(.danger)');
  await sleep(600);

  // ---- Delete with modal (cancel first) ----
  await rowAction(page, 'E2E Product Alpha', '.admin-cell-actions button.admin-icon-btn.danger');
  await sleep(500);
  ok('adm-delete: modal opens', await exists(page, '.admin-modal'));
  await clickByText(page, '.admin-modal button', 'Cancel');
  await sleep(400);
  ok('adm-delete: cancel keeps product', (await count(page, '.admin-table tbody tr')) === 1);
  await rowAction(page, 'E2E Product Alpha', '.admin-cell-actions button.admin-icon-btn.danger');
  await sleep(400);
  await clickByText(page, '.admin-modal button', 'Delete product');
  await sleep(700);
  ok('adm-delete: product removed from list', (await count(page, '.admin-table tbody tr')) === 0);
  await go(page, '/shop?q=E2E Product Alpha');
  await sleep(900);
  ok('adm-delete: gone from storefront', await exists(page, '.empty'));

  // ---- Product with NO description and NO images (both optional) ----
  await go(page, '/admin/products/add');
  await sleep(800);
  await type(page, 'input[placeholder="e.g. Essential Oversized Tee"]', 'E2E Bare Product');
  const bareNums = await page.$$('.admin-form-grid input[type="number"]');
  await bareNums[0].type('300');
  await sleep(300);
  await smartClick(page, '.admin-form-actions button[type="submit"]');
  await returnToProductList(page);
  await sleep(400);
  await type(page, '.admin-search input', 'E2E Bare Product');
  await sleep(500);
  ok('bare: product with no desc/images saved & listed', (await count(page, '.admin-table tbody tr')) === 1);
  await go(page, '/shop?q=E2E Bare Product');
  await sleep(900);
  ok('bare: storefront card renders', (await count(page, '.card')) === 1);
  ok('bare: card image falls back (no broken img)', await exists(page, '.card .pimg-fallback'));
  await smartClick(page, '.card-title');
  await sleep(900);
  ok('bare: PDP opens (not "incomplete")', !(await exists(page, '.pdp > p')) && await exists(page, '.pdp-info h1'));
  ok('bare: PDP image falls back', await exists(page, '.gallery-main .pimg-fallback'));
  // Clean up the bare test product so persisted state stays tidy.
  await go(page, '/admin/products');
  await sleep(700);
  await type(page, '.admin-search input', 'E2E Bare Product');
  await sleep(400);
  await rowAction(page, 'E2E Bare Product', '.admin-cell-actions button.admin-icon-btn.danger');
  await sleep(400);
  await clickByText(page, '.admin-modal button', 'Delete product');
  await sleep(700);
  ok('bare: test product deleted', (await count(page, '.admin-table tbody tr')) === 0);

  const errs = page._errors.slice(err0);
  ok('t4: zero console/page errors', errs.length === 0, errs.join(' || ').slice(0, 300));
}
