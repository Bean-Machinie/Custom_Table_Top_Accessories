import { describe, expect, it } from 'vitest';

import { getRotatedBoundingBox } from '../transform-geometry';

const baseTransform = {
  x: 50,
  y: 75,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  width: 200,
  height: 100
};

describe('transform geometry', () => {
  it('computes bounding box without rotation', () => {
    const box = getRotatedBoundingBox(baseTransform);
    expect(box.minX).toBeCloseTo(50);
    expect(box.maxY).toBeCloseTo(175);
    expect(box.center.x).toBeCloseTo(150);
    expect(box.center.y).toBeCloseTo(125);
  });

  it('computes rotated corners', () => {
    const rotated = getRotatedBoundingBox({ ...baseTransform, rotation: 45 });
    expect(rotated.width).toBeGreaterThan(baseTransform.width);
  });
});
