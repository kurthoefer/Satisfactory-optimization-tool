/**
 * Public surface of the image system.
 *
 * Phase 1 (this module): registry + React adapter + DOM component.
 * Phase 2 will add the ImageBitmap load entrypoint (viz path) here without
 * changing any of the exports below.
 */

export {
  loadImage,
  preload,
  subscribe,
  getEntry,
  type ImageEntry,
} from './imageRegistry';

export { useImage } from './useImage';
export { LoadedImage, type LoadedImageProps } from './LoadedImage';
