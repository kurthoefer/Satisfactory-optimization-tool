/**
 * Converts a product className to the corresponding image path
 * @param className - Product className (e.g., "Desc_Plastic_C")
 * @param size - Image size (64 or 256)
 * @returns Image path (e.g., "/images/items/desc-plastic-c_256.png")
 */

export default function getProductImagePath(
  className: string,
  size: 64 | 256 = 64
): string {
  const filename = className.toLowerCase().replace(/_/g, '-');
  return `/images/items/${filename}_${size}.png`;
}
