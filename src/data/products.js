const U = (id, w = 900, h = 1125) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const POOLS = {
  apparel: [
    'photo-1576566588028-4147f3842f27',
    'photo-1507679799987-c73779587ccf',
    'photo-1594938298603-c8148c4dae35',
    'photo-1591047139829-d91aecb6caea',
    'photo-1542272604-787c3835535d',
    'photo-1618354691373-d851c5c3a990',
    'photo-1556821840-3a63f95609a7',
    'photo-1521572163474-6864f9cf17ab',
  ],
  pants: [
    'photo-1542272604-787c3835535d',
    'photo-1594938298603-c8148c4dae35',
    'photo-1507679799987-c73779587ccf',
  ],
  hoodies: [
    'photo-1556821840-3a63f95609a7',
    'photo-1618354691373-d851c5c3a990',
    'photo-1507679799987-c73779587ccf',
  ],
  jackets: [
    'photo-1591047139829-d91aecb6caea',
    'photo-1594938298603-c8148c4dae35',
    'photo-1507679799987-c73779587ccf',
  ],
  pullover: [
    'photo-1556821840-3a63f95609a7',
    'photo-1618354691373-d851c5c3a990',
    'photo-1576566588028-4147f3842f27',
  ],
  shoes: [
    'photo-1542291026-7eec264c27ff',
    'photo-1549298916-b41d501d3772',
    'photo-1491553895911-0055eca6402d',
    'photo-1525966222134-fcfa99b8ae77',
    'photo-1600185365483-26d7a4cc7519',
    'photo-1460353581641-37baddab0fa2',
    'photo-1520639888713-7851133b1ed0',
  ],
};

export const IMAGES = {
  hero: new URL(`${import.meta.env.BASE_URL}store-hero.jpg`, document.baseURI).href,
  heroDesktop: new URL(`${import.meta.env.BASE_URL}store-hero-desktop.jpg`, document.baseURI).href,
  banner: U('photo-1445205170230-053b83016050', 1600, 900),
  categories: {
    shoes: U(POOLS.shoes[0], 700, 900),
    pants: U(POOLS.apparel[4], 700, 900),
    hoodies: U(POOLS.apparel[6], 700, 900),
    jackets: U(POOLS.apparel[3], 700, 900),
    pullover: U(POOLS.pullover[1], 700, 900),
  },
};

export const CATEGORIES = [
  { id: 'pants', label: 'Pants', labelAr: 'بناطيل', image: IMAGES.categories.pants },
  { id: 'hoodies', label: 'Hoodies', labelAr: 'هودي', image: IMAGES.categories.hoodies },
  { id: 'jackets', label: 'Jackets', labelAr: 'جواكت', image: IMAGES.categories.jackets },
  { id: 'pullover', label: 'Pullover', labelAr: 'بلوفرات', image: IMAGES.categories.pullover },
  { id: 'shoes', label: 'Shoes', labelAr: 'أحذية', image: IMAGES.categories.shoes },
];

export const SEASONS = [
  { id: 'winter', label: 'Winter' },
  { id: 'summer', label: 'Summer' },
  { id: 'both', label: 'All Seasons' },
];

export const isKnownCategory = (id) => CATEGORIES.some((c) => c.id === id);
export const getCategoryName = (category, lang) =>
  category ? (lang === 'ar' ? category.labelAr || category.label : category.label) : '';

export const normalizeSeason = (season) => {
  const value = String(season ?? 'both').trim().toLowerCase();
  const aliases = {
    'شتوي': 'winter',
    'الشتوي': 'winter',
    'شتوية': 'winter',
    'الشتوية': 'winter',
    'صيفي': 'summer',
    'الصيفي': 'summer',
    'صيفية': 'summer',
    'الصيفية': 'summer',
    'كليهما': 'both',
    'كلاهما': 'both',
  };
  return aliases[value] || value;
};

const COLOR = {
  Black: '#141414',
  White: '#f6f4ef',
  Beige: '#d9c9ae',
  Navy: '#1d2a44',
  Olive: '#6b6b45',
  Grey: '#8c8c8c',
  Camel: '#b88a56',
  Brown: '#5a3d2b',
  Blue: '#8fb0d6',
  Indigo: '#2f3f63',
  Charcoal: '#3a3a3a',
  Silver: '#c3c6c9',
  Gold: '#c9a24b',
};
const cols = (...names) => names.map((name) => ({ name, hex: COLOR[name] }));

const CLOTH_SIZES = ['S', 'M', 'L', 'XL'];
const SHOE_SIZES = ['40', '41', '42', '43', '44', '45'];

const DETAILS = {
  pants: ['Versatile everyday style', 'Available in selected sizes and colors', 'Easy to pair with casual and smart-casual outfits'],
  hoodies: ['Comfortable everyday layer', 'Available in selected sizes and colors', 'Designed for casual styling'],
  jackets: ['Versatile outer layer for everyday wear', 'Available in selected sizes and colors', 'Easy to style across seasons'],
  pullover: ['Comfortable pullover for everyday wear', 'Available in selected sizes and colors', 'Easy to layer with your everyday outfits'],
  shoes: ['Genuine materials, hand finished', 'Cushioned insole for all-day comfort', 'Wipe clean with a soft cloth'],
};

export const getProductDetails = (product) =>
  Array.isArray(product.details) && product.details.length
    ? product.details
    : DETAILS[product.category] || [];

const counters = { pants: 0, hoodies: 0, jackets: 0, pullover: 0, shoes: 0 };
let order = 0;

const make = (name, category, price, salePrice, colors, flags, description, sizes, season = 'both') => {
  const ci = counters[category]++;
  const pool = POOLS[category];
  const idx = order++;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return {
    id: slug,
    name,
    category,
    price,
    salePrice,
    colors,
    sizes: sizes || (category === 'shoes' ? SHOE_SIZES : CLOTH_SIZES),
    images: [0, 1, 2].map((k) => U(pool[(ci + k) % pool.length])),
    description,
    details: DETAILS[category],
    season,
    featured: flags.includes('f'),
    isNew: flags.includes('n'),
    bestSeller: flags.includes('b'),
    rating: Math.round((4.3 + ((idx * 3) % 7) / 10) * 10) / 10,
    reviews: 24 + ((idx * 37) % 180),
  };
};

export const TEST_PRODUCTS = [
  make('TEST - Tapered Chino Pants', 'pants', 1450, null, cols('Beige', 'Navy'), 'n',
    'Test catalog item for checking category browsing and product details.'),
  make('TEST - Relaxed Everyday Pants', 'pants', 1750, 1575, cols('Olive', 'Black'), 'b',
    'Test catalog item for checking discounted pricing and product filters.'),
  make('TEST - Classic Fleece Hoodie', 'hoodies', 1850, null, cols('Grey', 'Black'), 'n',
    'Test catalog item for checking category browsing and product details.'),
  make('TEST - Zip-Up Hoodie', 'hoodies', 2200, 1980, cols('Navy', 'Grey'), 'b',
    'Test catalog item for checking discounted pricing and product filters.'),
  make('TEST - Lightweight Utility Jacket', 'jackets', 2600, null, cols('Olive', 'Black'), 'f',
    'Test catalog item for checking category browsing and product details.'),
  make('TEST - Classic Denim Jacket', 'jackets', 3100, 2790, cols('Indigo', 'Black'), 'n',
    'Test catalog item for checking discounted pricing and product filters.'),
  make('TEST - Cotton Pullover', 'pullover', 1700, null, cols('Black', 'White'), 'n',
    'Test catalog item for checking category browsing and product details.'),
  make('TEST - Textured Knit Pullover', 'pullover', 2100, 1890, cols('Brown', 'Grey'), 'b',
    'Test catalog item for checking discounted pricing and product filters.'),
  make('TEST - Everyday Canvas Sneakers', 'shoes', 2200, null, cols('White', 'Black'), 'n',
    'Test catalog item for checking category browsing and product details.'),
  make('TEST - Leather Ankle Boots', 'shoes', 2700, 2430, cols('Brown', 'Black'), 'b',
    'Test catalog item for checking discounted pricing and product filters.'),
  Object.assign(
    make('TEST - Sold Out Product', 'pants', 2500, 2250, cols('Black', 'Grey'), 'f',
      'Test catalog item for checking the complete sold-out product state.'),
    { soldOut: true, soldOutColors: [], soldOutSizes: [] }
  ),
];

export const PRODUCTS = [
  ...TEST_PRODUCTS,
  // Shoes
  make('Minimal Leather Sneakers', 'shoes', 2900, null, cols('White', 'Black'), 'fb',
    'Hand-finished Italian leather sneakers with a clean low profile and a cushioned insole.'),
  make('Chelsea Boots', 'shoes', 3800, 3040, cols('Black', 'Brown'), 'b',
    'Smooth leather Chelsea boots with elastic side panels, pull tab and a durable stacked sole.'),
  make('Suede Loafers', 'shoes', 3100, null, cols('Brown', 'Black', 'Beige'), 'n',
    'Soft suede loafers with a flexible leather sole. Effortless with tailoring or denim.'),
  make('Court Sneakers', 'shoes', 2400, 1920, cols('White', 'Grey'), 'b',
    'Retro-inspired court sneakers with a vulcanised sole and perforated detailing.'),
  make('Trail Runner', 'shoes', 3300, null, cols('Grey', 'Black'), '',
    'Lightweight technical runners with a grippy outsole and breathable engineered mesh upper.'),
];

export const getProduct = (id) => PRODUCTS.find((p) => p.id === id);
export const sortByNewest = (products) =>
  products
    .map((product, index) => ({ product, index }))
    .sort((a, b) => (Number(b.product.createdAt) || 0) - (Number(a.product.createdAt) || 0) || a.index - b.index)
    .map(({ product }) => product);
export const sortBySaleAndNewest = (products) =>
  sortByNewest(products).sort((a, b) => Number(b.salePrice != null) - Number(a.salePrice != null));
export const effectivePrice = (p) => (p.salePrice != null ? p.salePrice : p.price);
// Every image the product carries: main images first, then any images uploaded
// inside the colors — deduped, truthy-only. Powers out-of-page rendering.
export const productImages = (product) => {
  const main = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
  const colorImages = (Array.isArray(product?.colors) ? product.colors : [])
    .flatMap((c) => (Array.isArray(c?.images) ? c.images.filter(Boolean) : []));
  return [...new Set([...main, ...colorImages])];
};
// Cover image shown outside the product page (cards, shop, home, admin lists):
// the product's main image, or — when the admin only uploaded images inside
// the colors — the first color image, so the card never falls back to a letter.
export const coverImage = (product) => productImages(product)[0] || '';
// Image that represents a specific color: the first image uploaded for that
// color in the admin panel, falling back to any other image of the product.
export const colorImage = (product, colorName) => {
  const color = Array.isArray(product?.colors)
    ? product.colors.find((c) => c?.name === colorName)
    : null;
  const first = Array.isArray(color?.images) ? color.images.find(Boolean) : null;
  return first || coverImage(product);
};
export const discountPercent = (p) =>
  p.salePrice != null ? Math.round((1 - p.salePrice / p.price) * 100) : 0;
