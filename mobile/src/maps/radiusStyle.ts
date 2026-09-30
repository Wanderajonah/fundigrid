/** Search-radius overlay — client blue (#2F80ED). */
export const RADIUS_FILL = 'rgba(47,128,237,0.12)';
export const RADIUS_STROKE = 'rgba(47,128,237,0.55)';

/** Web-mercator metres-per-pixel at a given zoom (256px tiles). */
export function metersPerPixel(latitude: number, zoom: number) {
  return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
}
