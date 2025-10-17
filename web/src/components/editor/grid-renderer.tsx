/**
 * Level-of-Detail (LOD) Grid Renderer
 * Dynamically adjusts grid size based on zoom level for crisp rendering
 * Prevents moiré patterns and maintains performance at all zoom levels
 */

import { useMemo } from 'react';

interface GridRendererProps {
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Grid configuration for different zoom levels
 * Each level has a base size and opacity
 */
interface GridLevel {
  minZoom: number;
  maxZoom: number;
  size: number; // Base grid size in pixels
  subdivisions?: number; // Optional subdivisions
  opacity: number;
}

const GRID_LEVELS: GridLevel[] = [
  // Very zoomed out - large cells only
  { minZoom: 0, maxZoom: 0.25, size: 100, opacity: 0.8 },
  // Zoomed out - medium cells
  { minZoom: 0.25, maxZoom: 0.5, size: 50, opacity: 0.85 },
  // Default - base grid
  { minZoom: 0.5, maxZoom: 1.5, size: 24, opacity: 0.9 },
  // Zoomed in - base + subdivisions
  { minZoom: 1.5, maxZoom: 3, size: 24, subdivisions: 2, opacity: 0.95 },
  // Very zoomed in - fine detail
  { minZoom: 3, maxZoom: Infinity, size: 12, subdivisions: 2, opacity: 1 }
];

/**
 * Select appropriate grid level based on zoom
 */
const getGridLevel = (zoom: number): GridLevel => {
  return GRID_LEVELS.find((level) => zoom >= level.minZoom && zoom < level.maxZoom) || GRID_LEVELS[2];
};

/**
 * Calculate optimal grid size to prevent moiré patterns
 * Ensures grid lines are always crisp at the current zoom level
 */
const calculateGridSize = (zoom: number): number => {
  const level = getGridLevel(zoom);
  const scaledSize = level.size * zoom;

  // If the scaled size is too small (< 8px), it causes moiré patterns
  // If it's too large (> 200px), it looks too sparse
  if (scaledSize < 8) {
    // Scale up to maintain minimum size
    return Math.ceil(8 / zoom);
  } else if (scaledSize > 200) {
    // Scale down to maintain maximum size
    return Math.floor(200 / zoom);
  }

  return level.size;
};

export const GridRenderer = ({ zoom, canvasWidth, canvasHeight }: GridRendererProps) => {
  const gridConfig = useMemo(() => {
    const level = getGridLevel(zoom);
    const size = calculateGridSize(zoom);
    const scaledSize = size * zoom;

    return {
      size,
      scaledSize,
      subdivisions: level.subdivisions || 0,
      opacity: level.opacity,
      // Calculate subdivision size
      subdivisionSize: level.subdivisions ? size / level.subdivisions : 0
    };
  }, [zoom]);

  // Create grid background style
  const gridStyle = useMemo(() => {
    const { size, subdivisions, subdivisionSize, opacity } = gridConfig;

    // Base grid
    const baseGrid = `
      linear-gradient(to right, rgba(94, 96, 120, ${opacity * 0.16}) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(94, 96, 120, ${opacity * 0.16}) 1px, transparent 1px)
    `;

    // Subdivision grid (lighter)
    const subdivisionGrid =
      subdivisions && subdivisionSize
        ? `
      linear-gradient(to right, rgba(94, 96, 120, ${opacity * 0.08}) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(94, 96, 120, ${opacity * 0.08}) 1px, transparent 1px),
    `
        : '';

    return {
      backgroundImage: subdivisionGrid + baseGrid,
      backgroundSize:
        subdivisions && subdivisionSize
          ? `${subdivisionSize}px ${subdivisionSize}px, ${size}px ${size}px`
          : `${size}px ${size}px`,
      // Ensure crisp rendering
      imageRendering: 'crisp-edges' as const
    };
  }, [gridConfig]);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={gridStyle}
      aria-hidden="true"
      data-grid-size={gridConfig.size}
      data-grid-zoom={zoom.toFixed(2)}
    />
  );
};
