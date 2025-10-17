/**
 * Pixel snapping utilities for crisp rendering
 * Ensures transforms are aligned to physical pixels
 */

/**
 * Snap a value to the nearest pixel boundary
 * Accounts for device pixel ratio for crisp rendering on high-DPI displays
 */
export const snapToPixel = (value: number, devicePixelRatio: number = window.devicePixelRatio): number => {
  const scale = devicePixelRatio;
  return Math.round(value * scale) / scale;
};

/**
 * Snap viewport offsets to pixel boundaries
 * Prevents blurry rendering during pan operations
 */
export const snapViewportOffsets = (offsetX: number, offsetY: number): { offsetX: number; offsetY: number } => {
  const dpr = window.devicePixelRatio || 1;
  return {
    offsetX: snapToPixel(offsetX, dpr),
    offsetY: snapToPixel(offsetY, dpr)
  };
};

/**
 * Snap transform values for layer positioning
 * Ensures layers render crisply
 */
export const snapLayerTransform = (x: number, y: number, width: number, height: number) => {
  const dpr = window.devicePixelRatio || 1;
  return {
    x: snapToPixel(x, dpr),
    y: snapToPixel(y, dpr),
    width: snapToPixel(width, dpr),
    height: snapToPixel(height, dpr)
  };
};

/**
 * Check if browser supports sub-pixel rendering
 * Most modern browsers do, but can be disabled for better performance
 */
export const supportsSubPixelRendering = (): boolean => {
  return typeof CSS !== 'undefined' && CSS.supports && CSS.supports('transform', 'translateX(0.5px)');
};
