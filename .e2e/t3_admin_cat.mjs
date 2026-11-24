import { go, sleep, txt, txtAll, count, exists, smartClick, clickByText, clickNth, type, attr, hash, loginAdmin } from './lib.mjs';
import { fileURLToPath } from 'node:url';

const FIXTURE = fileURLToPath(new URL('./upload.png', import.meta.url));

export default async function t3({ page, results, ok }) {
  const err0 = page._errors.length;

  // ---- Guard: not logged in ----
  await go(page, '/admin');
  await sleep(900);
  ok('guard: /admin redirects to login', (await hash(page)).includes('/admin/login'));

  // ---- Login page ----
  ok('login: back-to-store link', await exists(page, '.admin-login-back'));
  await type(page, '#admin-email', process.env.E2E_ADMIN_EMAIL || '');
  await type(page, '#admin-password', 'wrongpass');
  await smartClick(page, '.admin-login-submit');
  await sleep(500);
  ok('login: wrong password error', await exists(page, '.admin-error'));
  await loginAdmin(page);
  ok('login: success -> dashboard', (await hash(page)) === '#/admin');
  ok('dashboard: 4 stat cards', (await count(page, '.admin-stat')) === 4);
  ok('dashboard: stats show 16 products', ((await txtAll(page, '.admin-stat-value')) || [])[0] === '16');
  ok('dashboard: sidebar 6 links + view store', (await count(page, '.admin-sidebar .admin-link')) === 8
    && (await count(page, '.admin-sidebar .admin-link-danger')) === 1);

  // ---- Categories page ----
  await go(page, '/admin/categories');
  await sleep(800);
  ok('cat: 5 default cards', (await count(page, '.admin-category-card')) === 5);
  ok('cat: count badge text', ((await txt(page, '.admin-category-count')) || '').includes('5'));

  // add new category
  await type(page, 'form.admin-category-create label.admin-field:nth-of-type(1) input', 'E2E Cat');
  await type(page, 'form.admin-category-create label.admin-field:nth-of-type(2) input', 'فئة اختبار');
  await smartClick(page, 'form.admin-category-create button[type="submit"]');
  await sleep(800);
  ok('cat: added -> 6 cards', (await count(page, '.admin-category-card')) === 6);
  ok('cat: success toast', await exists(page, '.admin-toast--success'));
  const categoryData = await page.evaluate(async () => (await fetch('/api/categories')).json());
  ok('cat: persisted in D1', categoryData.categories?.some((category) => category.id === 'e2e-cat'));

  // storefront reflects new category
  await go(page, '/');
  await sleep(900);
  ok('cat: storefront shows 6 tiles', (await count(page, '.cat-tile')) === 6);
  ok('cat: storefront tile name', (await txtAll(page, '.cat-tile-title')).includes('E2E Cat'));
  await go(page, '/shop');
  await sleep(700);
  ok('cat: shop filter chip added', (await txtAll(page, '.quick-category-chip')).includes('E2E Cat'));

  // rename category (React controlled input needs native setter)
  await go(page, '/admin/categories');
  await sleep(800);
  const renamed = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.admin-category-card')];
    const card = cards.find((c) => c.innerText.includes('e2e-cat'));
    if (!card) return 'no-card';
    const input = card.querySelector('.admin-category-fields label.admin-field input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'E2E Cat v2');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 'ok';
  });
  await sleep(300);
  const saved = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.admin-category-card')];
    const card = cards.find((c) => c.innerText.includes('e2e-cat'));
    if (!card) return 'no-card';
    const btn = card.querySelector('.admin-category-save');
    if (!btn || btn.disabled) return 'disabled';
    btn.click();
    return 'clicked';
  });
  await sleep(800);
  ok('cat: rename saved', renamed === 'ok' && saved === 'clicked' && await exists(page, '.admin-toast--success'), `${renamed}/${saved}`);
  await go(page, '/');
  await sleep(900);
  ok('cat: storefront shows renamed tile', (await txtAll(page, '.cat-tile-title')).includes('E2E Cat v2'));

  // upload category image (<=1MB PNG fixture)
  await go(page, '/admin/categories');
  await sleep(800);
  const cardIdx = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.admin-category-card')];
    return cards.findIndex((c) => c.innerText.includes('e2e-cat'));
  });
  if (cardIdx >= 0) {
    const inputs = await page.$$('.admin-category-card .admin-category-file-input');
    await inputs[cardIdx].uploadFile(FIXTURE);
    await sleep(600);
    const saveBtns = await page.$$('.admin-category-save');
    await page.evaluate((b) => b.click(), saveBtns[cardIdx]);
    await sleep(700);
    const imgSrc = await page.evaluate((i) => {
      const cards = [...document.querySelectorAll('.admin-category-card')];
      return cards[i]?.querySelector('.admin-category-preview')?.src || '';
    }, cardIdx);
    ok('cat: image uploaded (dataURL)', imgSrc.startsWith('data:image/'), imgSrc.slice(0, 40));
  } else {
    ok('cat: image uploaded (dataURL)', false, 'card not found');
  }

  // delete category (confirm dialog auto-accepted)
  await sleep(400);
  const before7 = await count(page, '.admin-category-card');
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.admin-category-card')];
    const card = cards.find((c) => c.innerText.includes('e2e-cat'));
    card?.querySelector('.admin-category-delete')?.click();
  });
  await sleep(800);
  ok('cat: deleted -> back to 5', before7 === 6 && (await count(page, '.admin-category-card')) === 5);
  await go(page, '/');
  await sleep(900);
  ok('cat: storefront back to 5 tiles', (await count(page, '.cat-tile')) === 5);

  // delete disabled when category has products
  await go(page, '/admin/categories');
  await sleep(700);
  const disabledInfo = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.admin-category-card')];
    const card = cards.find((c) => c.innerText.includes('pants'));
    const btn = card?.querySelector('.admin-category-delete');
    return btn ? { disabled: btn.disabled, hint: btn.title } : null;
  }).catch(() => null);
  ok('cat: delete disabled for category in use', !!disabledInfo && disabledInfo.disabled, JSON.stringify(disabledInfo));

  const errs = page._errors.slice(err0);
  ok('t3: zero console/page errors', errs.length === 0, errs.join(' || ').slice(0, 300));
}
