export function getColorAvailability(product, colorName) {
  const color = (product?.colors || []).find((item) => item.name === colorName);
  if (!color) return { sizes: [], soldOutSizes: [], availableSizes: [], soldOut: true };

  const hasColorSizes = Array.isArray(color.sizes);
  const sizes = hasColorSizes ? color.sizes : (product.sizes || []);
  const soldOutSizes = Array.isArray(color.soldOutSizes)
    ? color.soldOutSizes
    : (hasColorSizes ? [] : (product.soldOutSizes || []));
  const soldOut = product.soldOut === true ||
    (product.soldOutColors || []).includes(colorName) ||
    (sizes.length > 0 && sizes.every((size) => soldOutSizes.includes(size)));

  return {
    sizes,
    soldOutSizes,
    availableSizes: soldOut ? [] : sizes.filter((size) => !soldOutSizes.includes(size)),
    soldOut,
  };
}

export function isVariantAvailable(product, colorName, size) {
  const availability = getColorAvailability(product, colorName);
  return !availability.soldOut &&
    availability.sizes.includes(size) &&
    !availability.soldOutSizes.includes(size);
}

export function hasAvailableVariant(product) {
  return !product?.soldOut &&
    (product?.colors || []).some((color) =>
      getColorAvailability(product, color.name).availableSizes.length > 0
    );
}
