const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;

export function validateProduct(product) {
  if (!product || typeof product !== 'object' || Array.isArray(product)) return 'Product must be an object.';
  if (typeof product.name !== 'string' || !product.name.trim() || product.name.trim().length > 120) {
    return 'Name is required and must be at most 120 characters.';
  }
  if (typeof product.category !== 'string' || !SLUG_RE.test(product.category)) return 'A valid category is required.';
  if (!Number.isFinite(product.price) || product.price <= 0 || product.price > 10_000_000) return 'Price must be a positive number.';
  if (product.salePrice != null && (!Number.isFinite(product.salePrice) || product.salePrice < 0 || product.salePrice >= product.price)) {
    return 'Sale price must be non-negative and lower than the regular price.';
  }
  if (!Array.isArray(product.colors) || product.colors.length === 0 || product.colors.length > 50) return 'Add between 1 and 50 colors.';
  const colorNames = product.colors.map((color) => String(color?.name || '').trim().toLowerCase());
  if (colorNames.some((name) => !name || name.length > 40) || new Set(colorNames).size !== colorNames.length) {
    return 'Color names must be present, unique and at most 40 characters.';
  }
  if (product.colors.some((color) =>
    !color || typeof color !== 'object' || !HEX_RE.test(color.hex || '') ||
    !Array.isArray(color.images || []) || (color.images || []).some((image) => typeof image !== 'string')
  )) {
    return 'Each color needs a valid hex color and image list.';
  }
  for (const color of product.colors) {
    if (color.sizes != null && (
      !Array.isArray(color.sizes) ||
      color.sizes.length > 50 ||
      color.sizes.some((size) => typeof size !== 'string' || !size.trim() || size.length > 32) ||
      new Set(color.sizes.map((size) => size.trim().toLowerCase())).size !== color.sizes.length
    )) {
      return 'Each color must have a valid, unique size list.';
    }
    if (color.soldOutSizes != null && (
      !Array.isArray(color.soldOutSizes) ||
      color.soldOutSizes.some((size) => typeof size !== 'string')
    )) {
      return 'Each color soldOutSizes must be a list of strings.';
    }
  }
  if (!Array.isArray(product.sizes) || product.sizes.length === 0 || product.sizes.length > 50) return 'Add between 1 and 50 sizes.';
  if (product.sizes.some((size) => typeof size !== 'string' || !size.trim() || size.length > 32)) return 'Each size must be a non-empty string of at most 32 characters.';
  if (new Set(product.sizes.map((size) => size.trim().toLowerCase())).size !== product.sizes.length) return 'Sizes must be unique.';
  const productSizeSet = new Set(product.sizes.map((size) => size.trim().toLowerCase()));
  if (product.colors.some((color) =>
    Array.isArray(color.sizes) && color.sizes.some((size) => !productSizeSet.has(size.trim().toLowerCase()))
  )) {
    return 'Color sizes must be included in the product size list.';
  }
  if (product.colors.some((color) => {
    const colorSizeSet = new Set(
      (Array.isArray(color.sizes) ? color.sizes : product.sizes)
        .map((size) => size.trim().toLowerCase())
    );
    return (color.soldOutSizes || []).some((size) =>
      !colorSizeSet.has(size.trim().toLowerCase())
    );
  })) {
    return 'Sold-out sizes must be available for that color.';
  }
  for (const flag of ['active', 'soldOut', 'featured', 'isNew', 'bestSeller']) {
    if (product[flag] != null && typeof product[flag] !== 'boolean') return `${flag} must be a boolean.`;
  }
  for (const list of ['soldOutColors', 'soldOutSizes']) {
    if (product[list] != null && (!Array.isArray(product[list]) || product[list].some((item) => typeof item !== 'string'))) {
      return `${list} must be a list of strings.`;
    }
  }
  const soldOutColorNames = new Set((product.soldOutColors || []).map((name) => name.toLowerCase()));
  if (product.colors.some((color) =>
    Array.isArray(color.sizes) &&
    color.sizes.length === 0 &&
    !soldOutColorNames.has(color.name.trim().toLowerCase())
  )) {
    return 'Each available color must have at least one size.';
  }
  if (!Array.isArray(product.images) || product.images.length > 30 || product.images.some((image) => typeof image !== 'string')) {
    return 'Product images must be a list of at most 30 URLs.';
  }
  if (new TextEncoder().encode(JSON.stringify(product)).byteLength > 1_800_000) {
    return 'Product data is too large to store. Upload images and retry.';
  }
  return null;
}

export function validateCategory(category, { requireId = true } = {}) {
  if (!category || typeof category !== 'object' || Array.isArray(category)) return 'Category must be an object.';
  if (requireId && (typeof category.id !== 'string' || !SLUG_RE.test(category.id))) return 'A valid category id is required.';
  if (typeof category.label !== 'string' || !category.label.trim() || category.label.trim().length > 80) return 'English category name is required.';
  if (typeof category.labelAr !== 'string' || !category.labelAr.trim() || category.labelAr.trim().length > 80) return 'Arabic category name is required.';
  if (category.image != null && (typeof category.image !== 'string' || category.image.length > 1_500_000)) return 'Category image is too large.';
  if (new TextEncoder().encode(JSON.stringify(category)).byteLength > 1_800_000) return 'Category data is too large to store.';
  return null;
}
