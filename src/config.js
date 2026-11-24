export const STORE = {
  name: 'STOCK STORE',
  tagline: 'Contemporary fashion, considered.',
  currency: 'EGP',
  whatsapp: '201289661122',
  email: 'mohamedalrosasy7@gmail.com',
  phone: '01289661122',
  address: 'المنشية، شارع متولي سردينة',
  stores: [
    { key: 'clothing', address: 'المنشية، شارع متولي سردينة' },
    { key: 'shoes', address: 'المنشية، شارع برج الشروق' },
  ],
  freeShippingThreshold: 2500,
  shippingFee: 120,
  social: {
    instagram: 'https://www.instagram.com/stockstore6?cnvx=MWcycnUyNTBzZDM5dg==',
    facebook: 'https://www.facebook.com/share/19nwErp11m/',
    tiktok: 'https://www.tiktok.com/@stockstore33?_r=1&_t=ZS-9BcqyqkT4Z4',
  },
};

export const money = (n) => `${Math.round(n).toLocaleString('en-US')} ${STORE.currency}`;

// Cloudinary image pipeline knobs (server-side secrets stay in .dev.vars /
// wrangler secrets; only the public cloud name is needed in the browser).
export const IMAGES = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
  // True when uploads should go through /api/upload -> Cloudinary instead of
  // storing base64 data URLs in D1.
  get useCloudinary() {
    return Boolean(this.cloudName);
  },
  // Longest side of uploaded photos before they leave the browser (px).
  uploadMaxEdge: 1600,
  // JPEG quality used while compressing in the browser (0-1).
  uploadQuality: 0.82,
  // Cloudinary folder for product / category / ad images.
  folder: 'stock-store',
};

// Builds a Cloudinary delivery URL that resizes on the fly (used for cards and
// thumbnails so the storefront never downloads the full-size original).
export const cloudinaryUrl = (src, { width = 700, height } = {}) => {
  if (typeof src !== 'string' || !IMAGES.cloudName) return src;
  const marker = `/upload/`;
  const base = `https://res.cloudinary.com/${IMAGES.cloudName}/image/upload/`;
  if (!src.startsWith(base) || !src.includes(marker)) return src;
  const transforms = [`w_${width}`, 'c_limit', 'q_auto', 'f_auto'];
  if (height) transforms.push(`h_${height}`, 'c_fill');
  return src.replace(marker, `/upload/${transforms.join(',')}/`);
};


