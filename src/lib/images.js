// Client-side image pipeline: compress + auto-orient (EXIF) before upload so
// the storefront never receives a 12MB phone photo. Falls back to the original
// file when the browser can't decode it (e.g. SVG or an unsupported codec).
import { IMAGES } from '../config';
import { uploadImage, deleteImage } from './api';

const ALLOWED = /^image\/(jpeg|png|webp|gif|avif)$/i;

export const isAllowedImage = (file) => ALLOWED.test(file?.type || '');

// Longest side -> px; keeps aspect ratio. Pure function of the bitmap, so it
// can be unit-tested without a DOM.
export const fitWithin = (width, height, maxEdge) => {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const ratio = maxEdge / longest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
};

// -> Promise<Blob> (JPEG) smaller than the original in most cases.
export async function compressImage(file, { maxEdge = IMAGES.uploadMaxEdge, quality = IMAGES.uploadQuality } = {}) {
  if (!isAllowedImage(file)) throw new Error('UNSUPPORTED_TYPE');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // let the server validate it
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  bitmap.close?.();
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], (file.name || 'image').replace(/\.[^.]*$/, '') + '.jpg', { type: 'image/jpeg' });
}

// Upload helper shared by the product form, category page and ads page.
// Resolves with the stored URL string.
export async function uploadStoreImage(file) {
  const prepared = await compressImage(file);
  try {
    const data = await uploadImage(prepared);
    return data.url;
  } catch {
    // Cloudinary not configured (local dev / E2E without secrets): keep the
    // image working via a local data URL so the pickers stay functional.
    return readFileAsDataUrl(prepared);
  }
}

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('Could not read the selected image.'));
  reader.readAsDataURL(file);
});

// Deletes every Cloudinary URL in `urls` (best-effort, parallel).
export async function purgeCloudinaryImages(urls) {
  const list = (Array.isArray(urls) ? urls : [urls]).filter(
    (u) => typeof u === 'string' && u.includes('res.cloudinary.com/')
  );
  if (!list.length) return;
  await Promise.all(list.map((url) => deleteImage(url)));
}