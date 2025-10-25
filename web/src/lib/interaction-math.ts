import type { Transform } from '@shared/index';

import { getLayerBoundsInDocSpace, type DocPoint } from './document-space';
import { getRotatedBoundingBox } from './transform-geometry';

export const computeMoveDelta = (start: DocPoint, current: DocPoint) => ({
  x: current.x - start.x,
  y: current.y - start.y
});

export const computeRotationDelta = (center: DocPoint, startPointer: DocPoint, current: DocPoint) => {
  const startAngle = Math.atan2(startPointer.y - center.y, startPointer.x - center.x);
  const currentAngle = Math.atan2(current.y - center.y, current.x - center.x);
  return ((currentAngle - startAngle) * 180) / Math.PI;
};

export const getSelectionCenter = (transforms: Transform[]): DocPoint | null => {
  if (transforms.length === 0) return null;
  const sum = transforms.reduce(
    (acc, transform) => {
      const { center } = getLayerBoundsInDocSpace(transform);
      acc.x += center.x;
      acc.y += center.y;
      return acc;
    },
    { x: 0, y: 0 }
  );
  return { x: sum.x / transforms.length, y: sum.y / transforms.length };
};

export const rotationPreservesCenter = (transform: Transform, deltaAngle: number) => {
  const originalCenter = getRotatedBoundingBox(transform).center;
  const rotatedCenter = getRotatedBoundingBox({ ...transform, rotation: transform.rotation + deltaAngle }).center;
  return {
    originalCenter,
    rotatedCenter
  };
};
