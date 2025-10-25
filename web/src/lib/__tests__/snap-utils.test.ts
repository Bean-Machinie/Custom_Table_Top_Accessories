import { describe, expect, it } from 'vitest';

import type { Transform } from '@shared/index';

import { computeSnap } from '../snap-utils';

const createTransform = (overrides: Partial<Transform> = {}): Transform => ({
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  ...overrides
});

describe('snap utils', () => {
  it('snaps translation to grid lines within threshold', () => {
    const result = computeSnap(
      [createTransform()],
      { x: 5.2, y: 3.9 },
      {
        gridSize: 10,
        threshold: 8,
        viewportZoom: 1,
        otherLayers: [],
        documentWidth: 500,
        documentHeight: 500
      }
    );
    expect(result.delta.x).toBeCloseTo(10);
    expect(result.delta.y).toBeCloseTo(0);
    expect(result.guides).not.toHaveLength(0);
  });
});
