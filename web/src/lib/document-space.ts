import type { Transform } from '@shared/index';

import type { ViewportGeometry } from './geometry';

export interface DocPoint {
  x: number;
  y: number;
}

export interface LayerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  center: DocPoint;
}

/**
 * Converts a client-space coordinate into document-space, accounting for zoom and canvas offset.
 */
export const toDocSpace = (
  clientX: number,
  clientY: number,
  viewport: ViewportGeometry,
  documentRect: DOMRect
): DocPoint => {
  const zoom = viewport.zoom || 1;
  return {
    x: (clientX - documentRect.left) / zoom,
    y: (clientY - documentRect.top) / zoom
  };
};

/**
 * Returns the layer bounds in document space using its unrotated dimensions.
 */
export const getLayerBoundsInDocSpace = (transform: Transform): LayerBounds => {
  const width = transform.width;
  const height = transform.height;
  const center = {
    x: transform.x + width / 2,
    y: transform.y + height / 2
  };

  return {
    x: transform.x,
    y: transform.y,
    width,
    height,
    center
  };
};
