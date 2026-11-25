import { go, sleep, txt, txtAll, count, exists, smartClick, clickByText, clickNth, type, attr, hash, lsGet } from './lib.mjs';

// Add-to-cart on a card links to the product page with #pick (variants are
// required), scrolling to the chooser and flashing it — the add happens there.
// From the PDP itself, "Add to cart" adds and then navigates straight to /cart.
const addChelseaToCart = async (page) => {
  await go(page, '/shop?q=Chelsea');
  await smartClick(page, '.card-title');
  await sleep(800);
  await clickByText(page, '.sizes .size', '42');
  await sleep(200);
  await smartClick(page, '.pdp-actions .btn-discover');
  await sleep(600);
};

export default async function t2({ page, results, ok }) {
  const err0 = page._errors.length;

  // Sold-out colors remain selectable for photo browsing, but cannot be ordered.
  await go(page, '/product/test-sold-out-product');
  await sleep(600);
  const soldOutColorEnabled = await page.$eval(
    '.variant-swatches .swatch:nth-child(2)',
    (button) => !button.disabled
  );
  await clickNth(page, '.variant-swatches .swatch', 1);
  await sleep(200);
  ok('pdp: sold-out color can be selected', soldOutColorEnabled
    && (await page.$eval('.variant-swatches .swatch:nth-child(2)', (button) => button.getAttribute('aria-checked'))) === 'true');
  ok('pdp: selected sold-out color highlights its images', (await count(page, '.thumb.matches-selected-color')) > 0);
  ok('pdp: sold-out product cannot be ordered', (await page.$eval('.pdp-actions .btn-discover', (button) => button.disabled))
    && (await page.$eval('.pdp-actions .btn-buy', (button) => button.disabled)));

  // ---- Card "Add to cart" -> PDP #pick (variants must be chosen on the PDP) ----
  await go(page, '/shop?q=Chelsea');
  await sleep(600);
  await smartClick(page, '.card .btn-full');
  await sleep(500);
  ok('card: add-to-cart -> PDP #pick', (await hash(page)).includes('/product/') && (await hash(page)).endsWith('#pick'));
  let flashed = false;
  for (let i = 0; i < 12 && !flashed; i++) { flashed = await exists(page, '.pick-flash'); if (!flashed) await sleep(150); }
  ok('card: chooser flashes on arrival', flashed);

  // ---- PDP gallery ----
  await go(page, '/shop?q=Chelsea');
  await smartClick(page, '.card-title');
  await sleep(900);
  ok('pdp: breadcrumb renders', await exists(page, '.breadcrumbs'));
  ok('pdp: 3 thumbnails', (await count(page, '.thumb')) === 3);
  const src1 = await page.$eval('.gallery-main img', (i) => i.src);
  await clickNth(page, '.thumb', 1);
  await sleep(400);
  const src2 = await page.$eval('.gallery-main img', (i) => i.src);
  ok('pdp: thumb click switches main image', src1 !== src2);
  ok('pdp: sale badge -20%', ((await txt(page, '.gallery-main .badge-sale')) || '') === '-20%');
  await clickNth(page, '.variant-swatches .swatch', 1);
  await sleep(250);
  ok('pdp: swatch selects Brown', (await page.$eval('.variant-swatches .swatch:nth-child(2)', (e) => e.getAttribute('aria-checked'))) === 'true');
  await clickByText(page, '.sizes .size', '42');
  await sleep(250);
  const activeSize = await page.evaluate(() =>
    [...document.querySelectorAll('.sizes .size')].find((b) => b.textContent.trim() === '42')?.className || 'missing');
  ok('pdp: size 42 active', activeSize.includes('active'), activeSize);
  await smartClick(page, 'button[aria-label="Increase quantity"]');
  await sleep(250);
  ok('pdp: qty + -> 2', (await txt(page, '.qty span')) === '2');
  await smartClick(page, 'button[aria-label="Decrease quantity"]');
  await smartClick(page, 'button[aria-label="Decrease quantity"]');
  await sleep(250);
  ok('pdp: qty floor at 1 & disabled', (await txt(page, '.qty span')) === '1'
    && (await page.$eval('button[aria-label="Decrease quantity"]', (b) => b.disabled)));
  await smartClick(page, '.variant-add');
  await sleep(300);
  ok('pdp: add another variant -> 2 rows', (await count(page, '.variant-row')) === 2);
  await smartClick(page, '.variant-remove');
  await sleep(300);
  ok('pdp: remove variant -> 1 row', (await count(page, '.variant-row')) === 1);

  // ---- Validation: add to cart without size ----
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1000);
  await smartClick(page, '.pdp-actions .btn-discover');
  await sleep(500);
  ok('pdp: missing size shows inline error', await exists(page, '.form-msg.error'));
  ok('pdp: missing size shows error toast', await exists(page, '.toast.error'));
  ok('pdp: nothing added to cart', !(await exists(page, 'a[href="#/cart"] .count')));

  // ---- Add to cart (navigates to /cart) + Buy Now (straight to checkout) ----
  await clickByText(page, '.sizes .size', '43');
  await sleep(200);
  await smartClick(page, '.pdp-actions .btn-discover');
  await sleep(800);
  ok('pdp: add to cart -> /cart', (await hash(page)).includes('/cart'));
  ok('pdp: added toast', await exists(page, '.toast.success'));
  ok('pdp: cart badge = 1', (await txt(page, 'a[href="#/cart"] .count')) === '1');
  // /cart is a lazy route — wait for the line instead of a fixed sleep.
  await page.waitForFunction(() => document.querySelector('.cart-line'), { timeout: 6000 }).catch(() => {});
  ok('pdp: cart page shows the added line', (await count(page, '.cart-line')) === 1);
  await go(page, '/shop?q=Chelsea');
  await smartClick(page, '.card-title');
  await sleep(800);
  await clickByText(page, '.sizes .size', '43');
  await sleep(200);
  await smartClick(page, '.pdp-actions .btn-buy');
  await sleep(800);
  ok('pdp: Buy Now -> /checkout', (await hash(page)).includes('/checkout'));

  // ---- Checkout validation ----
  await smartClick(page, '.summary button[type="submit"]');
  await sleep(500);
  ok('checkout: 4 field errors on empty submit', (await count(page, '.field-error')) === 4);
  ok('checkout: fix-fields toast', await exists(page, '.toast.error'));

  // ---- Fill & pay ----
  // Spy on window.open: the checkout must auto-open WhatsApp *inside* the click
  // handler (otherwise popup blockers would silently kill it).
  await page.evaluate(() => {
    window.__opened = [];
    const orig = window.open;
    window.open = function (...args) {
      const w = orig.apply(this, args);
      window.__opened.push({ url: args[0], target: args[1], got: !!w });
      return w;
    };
  });
  await type(page, '#fullName', `E2E Test ${process.env.E2E_RUN_ID || Date.now()}`);
  await type(page, '#phone', '+201234567890');
  await type(page, '#address', '12 Test Street, Maadi');
  await type(page, '#city', 'Cairo');
  await page.click('input[name="payment"][value="instapay"]');
  await sleep(300);
  ok('checkout: instapay selected note', ((await txt(page, '.summary .center')) || '').includes('InstaPay'));
  const orderResponsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/orders' && response.request().method() === 'POST'
  );
  await smartClick(page, '.summary button[type="submit"]');
  const orderResponse = await orderResponsePromise;
  const savedOrder = await orderResponse.json();
  await page.waitForFunction(() => location.hash.includes('/order/'), { timeout: 6000 });
  await sleep(700);
  const orderHash = await hash(page);
  ok('order: success page', ((await txt(page, '.success h1')) || '').includes('confirmed'));
  ok('order: saved in D1', orderResponse.status() === 201 && !!savedOrder.order?.id
    && orderHash.includes(savedOrder.order.id));
  ok('order: cart cleared after purchase', !(await exists(page, 'a[href="#/cart"] .count')));
  const waHref = await attr(page, 'a[href*="wa.me"]', 'href');
  ok('order: whatsapp link present', !!waHref && waHref.startsWith('https://wa.me/'));
  // The checkout must have auto-opened WhatsApp right at confirm-click time:
  // first a blank tab synchronously inside the click, then the wa.me URL on
  // the same tick once the order number exists.
  const opened = await page.evaluate(() => window.__opened || []);
  const firstCall = opened[0] || {};
  ok('order: whatsapp auto-opened on confirm',
    opened.length >= 1 && firstCall.url === '' && firstCall.target === '_blank',
    JSON.stringify(opened).slice(0, 200));
  // The blank tab is then redirected via location.replace() — verify the real
  // tab ended up on the store's WhatsApp number.
  const otherUrls = [];
  for (let i = 0; i < 10; i++) {
    otherUrls.length = 0;
    for (const p of await page.browser().pages()) if (p !== page) otherUrls.push(p.url());
    if (otherUrls.some((u) => u.includes('wa.me') || u.includes('whatsapp'))) break;
    await sleep(300);
  }
  ok('order: whatsapp tab redirected to wa.me',
    otherUrls.some((u) => u.includes('201289661122') && (u.includes('wa.me') || u.includes('whatsapp'))),
    otherUrls.join(' | ').slice(0, 200));
  for (const other of await page.browser().pages()) {
    if (other !== page) await other.close({ runBeforeUnload: false });
  }
  await clickByText(page, '.success a', 'Continue shopping');
  await sleep(600);
  ok('order: continue shopping -> /shop', (await hash(page)) === '#/shop');

  // ---- Cart page: qty/remove + guard ----
  await addChelseaToCart(page);
  await go(page, '/cart');
  ok('cart: 1 line rendered', (await count(page, '.cart-line')) === 1);
  const totalBefore = parseInt(((await txt(page, '.cart-line .cart-total')) || '0').replace(/[^\d]/g, ''), 10);
  await smartClick(page, '.cart-line button[aria-label="Increase quantity"]');
  await sleep(400);
  const totalAfter = parseInt(((await txt(page, '.cart-line .cart-total')) || '0').replace(/[^\d]/g, ''), 10);
  ok('cart: qty+ doubles line total', totalAfter === totalBefore * 2, `${totalBefore} -> ${totalAfter}`);
  await clickByText(page, '.cart-line .link-btn', 'Remove');
  await sleep(500);
  ok('cart: remove -> empty state', await exists(page, '.empty'));
  await go(page, '/checkout');
  await sleep(600);
  ok('cart: guard redirects empty checkout -> /cart', (await hash(page)) === '#/cart');

  // ---- Clear cart flow ----
  await addChelseaToCart(page);
  await go(page, '/cart');
  await clickByText(page, '.cart-lines .link-btn', 'Clear cart');
  await sleep(500);
  ok('cart: clear -> empty state + toast', await exists(page, '.empty') && await exists(page, '.toast'));

  // ---- Order not found ----
  await go(page, '/order/MV-NOPE');
  ok('order: unknown id -> not found', ((await txt(page, '.empty h1')) || '').includes('not found'));

  // ---- Back to Arabic storefront ----
  await page.evaluate(() => localStorage.setItem('mv-lang', 'ar'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1200);
  ok('ar: back to rtl', (await page.evaluate(() => document.documentElement.dir)) === 'rtl');
  ok('ar: nav shows المتجر', ((await txtAll(page, '.nav-links a')) || []).includes('المتجر'));
  await go(page, '/shop?q=Chelsea');
  await sleep(900);
  const badge = await txt(page, '.card .badge-sale');
  ok('ar: sale badge text intact', !!badge && badge.startsWith('-') && badge.endsWith('%'), badge);

  const errs = page._errors.slice(err0);
  ok('t2: zero console/page errors', errs.length === 0, errs.join(' || ').slice(0, 300));
}
