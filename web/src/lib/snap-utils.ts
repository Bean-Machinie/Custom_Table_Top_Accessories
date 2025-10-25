import type { Transform } from '@shared/index';

import { getRotatedBoundingBox } from './transform-geometry';

export interface SnapGuide {
  id: string;
  orientation: 'vertical' | 'horizontal';
  position: number;
}

export interface SnapContext {
  gridSize: number;
  threshold: number;
  viewportZoom: number;
  otherLayers: Transform[];
  documentWidth: number;
  documentHeight: number;
}

export interface SnapResult {
  delta: { x: number; y: number };
  guides: SnapGuide[];
}

const snapToValue = (value: number, targets: number[], threshold: number) => {
  let closest = value;
  let minDistance = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    const distance = Math.abs(target - value);
    if (distance < minDistance && distance <= threshold) {
      minDistance = distance;
      closest = target;
    }
  }
  return { snapped: closest, distance: minDistance };
};

export const computeSnap = (
  transforms: Transform[],
  delta: { x: number; y: number },
  context: SnapContext
): SnapResult => {
  if (transforms.length === 0) {
    return { delta, guides: [] };
  }

  const threshold = context.threshold / (context.viewportZoom || 1);
  const guides: SnapGuide[] = [];

  const boxes = transforms.map((transform) =>
    getRotatedBoundingBox({ ...transform, x: transform.x + delta.x, y: transform.y + delta.y })
  );
  const selectionBox = {
    minX: Math.min(...boxes.map((box) => box.minX)),
    maxX: Math.max(...boxes.map((box) => box.maxX)),
    minY: Math.min(...boxes.map((box) => box.minY)),
    maxY: Math.max(...boxes.map((box) => box.maxY))
  };

  const selectionMinX = selectionBox.minX;
  const selectionMaxX = selectionBox.maxX;
  const selectionMinY = selectionBox.minY;
  const selectionMaxY = selectionBox.maxY;
  const selectionCenterX = (selectionMinX + selectionMaxX) / 2;
  const selectionCenterY = (selectionMinY + selectionMaxY) / 2;

  const snapTargetsX = new Set<number>([0, context.documentWidth]);
  const snapTargetsY = new Set<number>([0, context.documentHeight]);

  if (context.gridSize > 0) {
    const gridSnapX = Math.round(selectionMinX / context.gridSize) * context.gridSize;
    const gridSnapY = Math.round(selectionMinY / context.gridSize) * context.gridSize;
    snapTargetsX.add(gridSnapX);
    snapTargetsY.add(gridSnapY);
  }

  context.otherLayers.forEach((transform) => {
    const box = getRotatedBoundingBox(transform);
    snapTargetsX.add(box.minX);
    snapTargetsX.add(box.maxX);
    snapTargetsX.add(box.center.x);
    snapTargetsY.add(box.minY);
    snapTargetsY.add(box.maxY);
    snapTargetsY.add(box.center.y);
  });

  const { snapped: snappedX, distance: dx } = snapToValue(selectionBox.minX, Array.from(snapTargetsX), threshold);
  const { snapped: snappedY, distance: dy } = snapToValue(selectionBox.minY, Array.from(snapTargetsY), threshold);

  if (Number.isFinite(dx) && Math.abs(snappedX - selectionBox.minX) <= threshold) {
    guides.push({ id: `snap-x-${Math.round(snappedX * 10)}`, orientation: 'vertical', position: snappedX });
  }
  if (Number.isFinite(dy) && Math.abs(snappedY - selectionBox.minY) <= threshold) {
    guides.push({ id: `snap-y-${Math.round(snappedY * 10)}`, orientation: 'horizontal', position: snappedY });
  }

  const snappedDelta = {
    x: delta.x + (snappedX - selectionBox.minX),
    y: delta.y + (snappedY - selectionBox.minY)
  };

  return { delta: snappedDelta, guides };
};
