import type { Layer, Transform } from '@shared/index';

import { expandBoundingBoxes, getRotatedBoundingBox } from './transform-geometry';

export interface SelectionBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type SelectionSource = Array<Transform | Layer | { transform: Transform }>;

const toTransform = (entry: Transform | Layer | { transform: Transform }): Transform | null => {
  if (!entry) return null;
  if ('width' in entry && 'height' in entry && 'rotation' in entry) {
    return entry as Transform;
  }
  if ('transform' in entry) {
    return (entry as { transform: Transform }).transform;
  }
  if ('type' in entry) {
    return (entry as Layer).transform;
  }
  return null;
};

export const getSelectionBBox = (selection: SelectionSource): SelectionBoundingBox | null => {
  if (selection.length === 0) return null;
  const boxes = selection
    .map(toTransform)
    .filter((transform): transform is Transform => Boolean(transform))
    .map((transform) => getRotatedBoundingBox(transform));
  if (boxes.length === 0) return null;
  const merged = expandBoundingBoxes(boxes);
  if (!merged) return null;
  return {
    x: merged.minX,
    y: merged.minY,
    width: merged.width,
    height: merged.height
  };
};
