/**
 * Utilities for calculating and enforcing pan boundaries with elastic resistance
 */

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ElasticBoundsConfig {
  // How much content can extend beyond the viewport before applying resistance
  marginFactor: number; // 0.5 = allow 50% of viewport to extend beyond
  // Strength of elastic resistance (0-1, higher = more resistance)
  resistance: number;
}

const DEFAULT_CONFIG: ElasticBoundsConfig = {
  marginFactor: 0.5,
  resistance: 0.7
};

/**
 * Calculate pan bounds for a canvas
 * Allows some panning beyond the canvas edges for a better UX
 */
export const calculatePanBounds = (
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
  config: ElasticBoundsConfig = DEFAULT_CONFIG
): Bounds => {
  // Calculate how much of the canvas is visible at current zoom
  const visibleWidth = viewportWidth / zoom;
  const visibleHeight = viewportHeight / zoom;

  // Allow panning with some margin beyond the canvas
  const marginX = visibleWidth * config.marginFactor;
  const marginY = visibleHeight * config.marginFactor;

  // Calculate bounds in viewport offset space
  // Offset is positive when canvas moves right/down
  return {
    // Right edge: canvas left edge can go to right side of viewport
    maxX: (canvasWidth - visibleWidth + marginX) * zoom,
    // Left edge: canvas right edge can go to left side of viewport
    minX: -(marginX * zoom),
    // Bottom edge: canvas top edge can go to bottom of viewport
    maxY: (canvasHeight - visibleHeight + marginY) * zoom,
    // Top edge: canvas bottom edge can go to top of viewport
    minY: -(marginY * zoom)
  };
};

/**
 * Apply elastic resistance when panning beyond bounds
 * Returns the constrained offset with elastic feel
 */
export const applyElasticResistance = (
  offset: number,
  bounds: { min: number; max: number },
  config: ElasticBoundsConfig = DEFAULT_CONFIG
): number => {
  if (offset < bounds.min) {
    // Beyond minimum bound
    const overshoot = bounds.min - offset;
    const resistance = overshoot * config.resistance;
    return bounds.min - resistance;
  } else if (offset > bounds.max) {
    // Beyond maximum bound
    const overshoot = offset - bounds.max;
    const resistance = overshoot * config.resistance;
    return bounds.max + resistance;
  }
  return offset;
};

/**
 * Constrain viewport offsets within bounds with elastic resistance
 */
export const constrainViewportWithElasticity = (
  offsetX: number,
  offsetY: number,
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
  config?: ElasticBoundsConfig
): { offsetX: number; offsetY: number } => {
  const bounds = calculatePanBounds(
    canvasWidth,
    canvasHeight,
    viewportWidth,
    viewportHeight,
    zoom,
    config
  );

  return {
    offsetX: applyElasticResistance(offsetX, { min: bounds.minX, max: bounds.maxX }, config),
    offsetY: applyElasticResistance(offsetY, { min: bounds.minY, max: bounds.maxY }, config)
  };
};

/**
 * Hard clamp offsets to bounds (no elasticity)
 * Use this for snapping back after pan ends
 */
export const clampToBounds = (
  offsetX: number,
  offsetY: number,
  bounds: Bounds
): { offsetX: number; offsetY: number } => {
  return {
    offsetX: Math.max(bounds.minX, Math.min(bounds.maxX, offsetX)),
    offsetY: Math.max(bounds.minY, Math.min(bounds.maxY, offsetY))
  };
};
