import { STORE_PRICING } from '../shared/pricing.js';

export const STORE = {
  name: 'STOCK STORE',
  tagline: 'Contemporary fashion, considered.',
  ...STORE_PRICING,
  whatsapp: '201289661122',
  email: 'mohamedalrosasy7@gmail.com',
  phone: '01289661122',
  address: 'المنشية، شارع متولي سردينة',
  stores: [
    { key: 'clothing', address: 'المنشية، شارع متولي سردينة' },
    { key: 'shoes', address: 'المنشية، شارع برج الشروق' },
  ],
  social: {
    instagram: 'https://www.instagram.com/stockstore6?cnvx=MWcycnUyNTBzZDM5dg==',
    facebook: 'https://www.facebook.com/share/19nwErp11m/',
    tiktok: 'https://www.tiktok.com/@stockstore33?_r=1&_t=ZS-9BcqyqkT4Z4',
  },
};

export const money = (n) => `${Math.round(n).toLocaleString('en-US')} ${STORE.currency}`;

// Cloudinary image pipeline knobs. Uploads use the public Cloud Name in the
// storefront; the upload preset stays in the authenticated Pages Function.
export const IMAGES = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'mpbvtc5j',
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

const cloudinaryBase = `https://res.cloudinary.com/${IMAGES.cloudName}/image/upload/`;

const isCloudinaryImage = (src) =>
  typeof src === 'string' && !!IMAGES.cloudName && src.startsWith(cloudinaryBase);

// Builds a Cloudinary delivery URL that resizes on the fly.
export const cloudinaryUrl = (src, { width = 700, height } = {}) => {
  const marker = `/upload/`;
  if (!isCloudinaryImage(src) || !src.includes(marker)) return src;
  const transforms = [`w_${width}`, 'c_limit', 'q_auto', 'f_auto'];
  if (height) transforms.push(`h_${height}`, 'c_fill');
  return src.replace(marker, `/upload/${transforms.join(',')}/`);
};

export const cloudinarySrcSet = (src, widths) => {
  if (!isCloudinaryImage(src)) return undefined;
  return widths.map((width) => `${cloudinaryUrl(src, { width })} ${width}w`).join(', ');
};


