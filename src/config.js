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

const SIZES = {
  card: 'f_auto,q_auto,w_500,c_limit',
  detail: 'f_auto,q_auto,w_800,c_limit',
  thumb: 'f_auto,q_auto,w_200,c_limit',
  hero: 'f_auto,q_auto,w_1000,c_limit',
  category: 'f_auto,q_auto,w_500,c_limit',
};

// Builds a size-optimized Cloudinary URL without creating another stored image.
export const cloudinaryUrl = (src, size) => {
  if (typeof src !== 'string' || !IMAGES.cloudName) return src;
  const transformation = SIZES[size];
  if (!transformation) throw new Error(`Unknown Cloudinary image size: ${size}`);
  const marker = `/upload/`;
  const base = `https://res.cloudinary.com/${IMAGES.cloudName}/image/upload/`;
  if (src.startsWith(base) && src.includes(marker)) {
    return src.replace(marker, `/upload/${transformation}/`);
  }
  return src;
};

export const categoryImageUrl = (src) => {
  const cloudinarySrc = cloudinaryUrl(src, 'category');
  if (cloudinarySrc !== src) return cloudinarySrc;
  if (typeof src !== 'string' || !src.startsWith('https://images.unsplash.com/')) return src;

  const url = new URL(src);
  url.searchParams.set('auto', 'format');
  url.searchParams.set('fit', 'crop');
  url.searchParams.set('w', '500');
  url.searchParams.set('h', '625');
  url.searchParams.set('q', '70');
  return url.href;
};


