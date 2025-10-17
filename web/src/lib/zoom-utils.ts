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

export const DEFAULT_VIEWPORT_PADDING = 500;

export interface ViewportTransform {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Calculates the minimum zoom level based on canvas and viewport size
 * Ensures canvas doesn't get smaller than 200px margin on each side
 *
 * @param canvasWidth - Width of the canvas
 * @param canvasHeight - Height of the canvas
 * @param viewportWidth - Width of the viewport
 * @param viewportHeight - Height of the viewport
 * @returns Minimum zoom level
 */
export const calculateMinZoom = (
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding: number = DEFAULT_VIEWPORT_PADDING,
  baseMinZoom: number = DEFAULT_ZOOM_CONFIG.minZoom
): number => {
  if (
    canvasWidth <= 0 ||
    canvasHeight <= 0 ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return baseMinZoom;
  }

  const widthConstraint = viewportWidth / (canvasWidth + padding * 2);
  const heightConstraint = viewportHeight / (canvasHeight + padding * 2);

  // Ensure we satisfy both axis constraints, but never require zooming in past 100%
  const paddedMinZoom = Math.min(1, Math.max(widthConstraint, heightConstraint));

  return Math.max(paddedMinZoom, baseMinZoom);
};

/**
 * Clamps a zoom value within the configured min/max range
 * Can optionally use dynamic minimum based on canvas/viewport size
 */
export const clampZoom = (
  zoom: number,
  config: ZoomConfig = DEFAULT_ZOOM_CONFIG,
  canvasWidth?: number,
  canvasHeight?: number,
  viewportWidth?: number,
  viewportHeight?: number,
  padding: number = DEFAULT_VIEWPORT_PADDING
): number => {
  let minZoom = config.minZoom;

  // If canvas and viewport dimensions provided, calculate dynamic minimum
  if (
    typeof canvasWidth === 'number' &&
    typeof canvasHeight === 'number' &&
    typeof viewportWidth === 'number' &&
    typeof viewportHeight === 'number'
  ) {
    minZoom = calculateMinZoom(
      canvasWidth,
      canvasHeight,
      viewportWidth,
      viewportHeight,
      padding,
      config.minZoom
    );
  }

  return Math.min(Math.max(zoom, minZoom), config.maxZoom);
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
  options?: {
    config?: ZoomConfig;
    contentWidth?: number;
    contentHeight?: number;
    padding?: number;
  }
): ViewportTransform => {
  const {
    config = DEFAULT_ZOOM_CONFIG,
    contentWidth,
    contentHeight,
    padding
  } = options ?? {};

  const clampedZoom = clampZoom(
    targetZoom,
    config,
    contentWidth,
    contentHeight,
    containerWidth,
    containerHeight,
    padding
  );

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
  options?: {
    config?: ZoomConfig;
    contentWidth?: number;
    contentHeight?: number;
    padding?: number;
  }
): ViewportTransform => {
  return zoomAboutPoint(
    currentTransform,
    targetZoom,
    containerWidth / 2,
    containerHeight / 2,
    containerWidth,
    containerHeight,
    options
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
 *
 * Since canvas uses origin-top-left with left-1/2 top-1/2 positioning,
 * we need negative offsets to center it properly:
 * - Container center is at (50%, 50%)
 * - Canvas top-left starts at container center
 * - To center canvas, shift it back by half its scaled dimensions
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

  // Calculate centered offsets
  // Canvas top-left is at container center (50%, 50%)
  // Shift back by half the scaled canvas size to center it
  const offsetX = -(contentWidth * fitZoom) / 2;
  const offsetY = -(contentHeight * fitZoom) / 2;

  return {
    zoom: fitZoom,
    offsetX,
    offsetY
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
