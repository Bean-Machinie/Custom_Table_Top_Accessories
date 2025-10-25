import type { Layer, Transform } from '@shared/index';
import { describe, expect, it } from 'vitest';

import { hitTestLayers } from '../hit-test';

const createLayer = (id: string, overrides: Partial<Transform> = {}): Layer => ({
  id,
  name: id,
  type: 'image',
  order: 0,
  visible: true,
  locked: false,
  parentId: null,
  transform: {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    ...overrides
  }
});

describe('hit testing', () => {
  it('returns the topmost layer under the pointer', () => {
    const layers = [
      createLayer('bottom', { x: 0, y: 0 }),
      createLayer('top', { x: 0, y: 0 })
    ];
    const hit = hitTestLayers(layers, { x: 10, y: 10 });
    expect(hit?.id).toBe('top');
  });

  it('ignores locked layers', () => {
    const layers = [createLayer('locked', { x: 0, y: 0 }), createLayer('free', { x: 10, y: 10 })];
    layers[0].locked = true;
    const hit = hitTestLayers(layers, { x: 0, y: 0 });
    expect(hit).toBeNull();
  });
});
