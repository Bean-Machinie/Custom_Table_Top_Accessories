/**
 * Zoom utility functions for cursor-anchored zooming
 */

export interface ZoomConfig {
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  wheelZoomFactor: number;
}

export const DEFAULT_ZOOM_CONFIG: ZoomConfig = {
  minZoom: 0.05, // 5%
  maxZoom: 8, // 800%
  zoomStep: 1.2,
  wheelZoomFactor: 0.1
};

export interface ViewportTransform {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Clamps a zoom value within the configured min/max range
 */
export const clampZoom = (zoom: number, config: ZoomConfig = DEFAULT_ZOOM_CONFIG): number => {
  return Math.min(Math.max(zoom, config.minZoom), config.maxZoom);
};

/**
 * Calculates zoom and offsets to keep a specific point stable during zoom
 * This creates cursor-anchored zoom behavior
 *
 * @param currentTransform - Current viewport state
 * @param targetZoom - Desired zoom level (will be clamped)
 * @param cursorX - Cursor X position in container coordinates
 * @param cursorY - Cursor Y position in container coordinates
 * @param containerWidth - Width of the viewport container
 * @param containerHeight - Height of the viewport container
 * @param config - Zoom configuration
 * @returns New viewport transform with adjusted offsets
 */
export const zoomAboutPoint = (
  currentTransform: ViewportTransform,
  targetZoom: number,
  cursorX: number,
  cursorY: number,
  containerWidth: number,
  containerHeight: number,
  config: ZoomConfig = DEFAULT_ZOOM_CONFIG
): ViewportTransform => {
  const clampedZoom = clampZoom(targetZoom, config);

  // Convert cursor position from container space to canvas space
  // This finds the point on the canvas that's currently under the cursor
  const canvasX = (cursorX - containerWidth / 2 - currentTransform.offsetX) / currentTransform.zoom;
  const canvasY = (cursorY - containerHeight / 2 - currentTransform.offsetY) / currentTransform.zoom;

  // Calculate new offsets to keep the same canvas point under the cursor
  const newOffsetX = cursorX - containerWidth / 2 - canvasX * clampedZoom;
  const newOffsetY = cursorY - containerHeight / 2 - canvasY * clampedZoom;

  return {
    zoom: clampedZoom,
    offsetX: newOffsetX,
    offsetY: newOffsetY
  };
};

/**
 * Calculates zoom centered on the viewport (for toolbar buttons)
 */
export const zoomAboutCenter = (
  currentTransform: ViewportTransform,
  targetZoom: number,
  containerWidth: number,
  containerHeight: number,
  config: ZoomConfig = DEFAULT_ZOOM_CONFIG
): ViewportTransform => {
  return zoomAboutPoint(
    currentTransform,
    targetZoom,
    containerWidth / 2,
    containerHeight / 2,
    containerWidth,
    containerHeight,
    config
  );
};

/**
 * Calculates zoom level to fit content with margin
 *
 * @param contentWidth - Width of content to fit
 * @param contentHeight - Height of content to fit
 * @param containerWidth - Width of viewport container
 * @param containerHeight - Height of viewport container
 * @param margin - Margin percentage (0.1 = 10% margin)
 * @returns Zoom level that fits content
 */
export const calculateFitZoom = (
  contentWidth: number,
  contentHeight: number,
  containerWidth: number,
  containerHeight: number,
  margin: number = 0.1
): number => {
  const effectiveWidth = containerWidth * (1 - margin);
  const effectiveHeight = containerHeight * (1 - margin);

  const zoomX = effectiveWidth / contentWidth;
  const zoomY = effectiveHeight / contentHeight;

  return Math.min(zoomX, zoomY);
};

/**
 * Calculates transform to center and fit content in viewport
 */
export const fitToScreen = (
  contentWidth: number,
  contentHeight: number,
  containerWidth: number,
  containerHeight: number,
  margin: number = 0.1,
  config: ZoomConfig = DEFAULT_ZOOM_CONFIG
): ViewportTransform => {
  const fitZoom = clampZoom(
    calculateFitZoom(contentWidth, contentHeight, containerWidth, containerHeight, margin),
    config
  );

  return {
    zoom: fitZoom,
    offsetX: 0,
    offsetY: 0
  };
};

/**
 * Zoom preset types
 */
export type ZoomPreset = 'fit' | 'fill' | '100%' | '200%' | '50%';

/**
 * Gets zoom level for a preset
 */
export const getPresetZoom = (
  preset: ZoomPreset,
  contentWidth: number,
  contentHeight: number,
  containerWidth: number,
  containerHeight: number
): number => {
  switch (preset) {
    case 'fit':
      return calculateFitZoom(contentWidth, contentHeight, containerWidth, containerHeight, 0.1);
    case 'fill':
      return calculateFitZoom(contentWidth, contentHeight, containerWidth, containerHeight, 0);
    case '100%':
      return 1;
    case '200%':
      return 2;
    case '50%':
      return 0.5;
    default:
      return 1;
  }
};
