import type { Transform } from '@shared/index';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  center: { x: number; y: number };
  corners: [number, number][];
}

const degToRad = (deg: number) => (deg * Math.PI) / 180;

const rotatePoint = (x: number, y: number, angle: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos
  };
};

const add = (point: { x: number; y: number }, delta: { x: number; y: number }) => ({
  x: point.x + delta.x,
  y: point.y + delta.y
});

const scaleAbout = (
  point: { x: number; y: number },
  origin: { x: number; y: number },
  scaleX: number,
  scaleY: number
) => ({
  x: origin.x + (point.x - origin.x) * scaleX,
  y: origin.y + (point.y - origin.y) * scaleY
});

export const getTransformedCorners = (transform: Transform): [number, number][] => {
  const { width, height, rotation, scaleX, scaleY, x, y } = transform;
  const origin = { x: width / 2, y: height / 2 };
  const localCorners: [number, number][] = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height]
  ];
  const angle = degToRad(rotation);

  return localCorners.map(([cornerX, cornerY]) => {
    const scaled = scaleAbout({ x: cornerX, y: cornerY }, origin, scaleX, scaleY);
    const shifted = { x: scaled.x - origin.x, y: scaled.y - origin.y };
    const rotated = rotatePoint(shifted.x, shifted.y, angle);
    return [rotated.x + origin.x + x, rotated.y + origin.y + y];
  });
};

export const getRotatedBoundingBox = (transform: Transform): BoundingBox => {
  const corners = getTransformedCorners(transform);
  const xs = corners.map(([cx]) => cx);
  const ys = corners.map(([, cy]) => cy);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    corners
  };
};

export const applyDeltaToTransform = (
  transform: Transform,
  delta: Partial<Pick<Transform, 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY' | 'width' | 'height'>>
): Transform => ({
  ...transform,
  ...delta
});

export const expandBoundingBoxes = (boxes: BoundingBox[]): BoundingBox | null => {
  if (boxes.length === 0) return null;
  const minX = Math.min(...boxes.map((box) => box.minX));
  const minY = Math.min(...boxes.map((box) => box.minY));
  const maxX = Math.max(...boxes.map((box) => box.maxX));
  const maxY = Math.max(...boxes.map((box) => box.maxY));
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    corners: boxes.flatMap((box) => box.corners) as BoundingBox['corners']
  };
};

export const pointInPolygon = (point: { x: number; y: number }, polygon: [number, number][]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

export const translateBoundingBox = (box: BoundingBox, delta: { x: number; y: number }): BoundingBox => {
  const corners = box.corners.map(([cx, cy]) => [cx + delta.x, cy + delta.y]) as BoundingBox['corners'];
  return {
    ...box,
    minX: box.minX + delta.x,
    minY: box.minY + delta.y,
    maxX: box.maxX + delta.x,
    maxY: box.maxY + delta.y,
    center: add(box.center, delta),
    corners
  };
};
