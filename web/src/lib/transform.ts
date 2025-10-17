import type { Transform } from '@shared/index';

export const defaultTransform = (width: number, height: number): Transform => ({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  width,
  height
});

export const transformToCss = (transform: Transform) => {
  const { x, y, scaleX, scaleY, rotation, width, height } = transform;
  return {
    width: `${width}px`,
    height: `${height}px`,
    transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`
  };
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const applyDelta = (
  transform: Transform,
  delta: Partial<Pick<Transform, 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY'>>
): Transform => ({
  ...transform,
  ...delta
});

export const resizeTransform = (
  transform: Transform,
  width: number,
  height: number
): Transform => ({
  ...transform,
  width,
  height
});

export const roundTransform = (transform: Transform): Transform => ({
  ...transform,
  x: Math.round(transform.x),
  y: Math.round(transform.y),
  width: Math.round(transform.width),
  height: Math.round(transform.height)
});
