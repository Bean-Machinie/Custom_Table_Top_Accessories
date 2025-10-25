import { describe, expect, it } from 'vitest';

import type { Transform } from '@shared/index';

import { computeMoveDelta, computeRotationDelta, rotationPreservesCenter } from '../interaction-math';

describe('interaction math', () => {
  it('returns zero delta when pointer has not moved', () => {
    const start = { x: 120, y: 240 };
    const current = { x: 120, y: 240 };
    expect(computeMoveDelta(start, current)).toEqual({ x: 0, y: 0 });
  });

  it('keeps the layer center stable when rotating about its origin', () => {
    const transform: Transform = {
      x: 100,
      y: 150,
      width: 200,
      height: 120,
      rotation: 0,
      scaleX: 1,
      scaleY: 1
    };
    const center = { x: transform.x + transform.width / 2, y: transform.y + transform.height / 2 };
    const startPointer = { x: center.x, y: center.y - 100 };
    const currentPointer = { x: center.x + 100, y: center.y };

    const delta = computeRotationDelta(center, startPointer, currentPointer);
    const { originalCenter, rotatedCenter } = rotationPreservesCenter(transform, delta);

    expect(delta).toBeCloseTo(90, 3);
    expect(rotatedCenter.x).toBeCloseTo(originalCenter.x, 5);
    expect(rotatedCenter.y).toBeCloseTo(originalCenter.y, 5);
  });
});
