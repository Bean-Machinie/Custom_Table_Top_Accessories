import { describe, expect, it } from 'vitest';

import { applyDelta, defaultTransform, resizeTransform, roundTransform, transformToCss } from '../transform';

describe('transform utilities', () => {
  it('creates a default transform with provided dimensions', () => {
    const transform = defaultTransform(100, 200);
    expect(transform.width).toBe(100);
    expect(transform.height).toBe(200);
    expect(transform.rotation).toBe(0);
  });

  it('converts to css transform', () => {
    const transform = defaultTransform(100, 200);
    const css = transformToCss(transform);
    expect(css.transform).toContain('translate(0px, 0px)');
    expect(css.transform).toContain('translate(50px, 100px)');
    expect(css.transform).toContain('rotate(0deg)');
    expect(css.transform).toContain('scale(1, 1)');
    expect(css.transform).toContain('translate(-50px, -100px)');
  });

  it('applies deltas immutably', () => {
    const transform = defaultTransform(100, 200);
    const updated = applyDelta(transform, { x: 10, y: 5 });
    expect(updated).not.toBe(transform);
    expect(updated.x).toBe(10);
    expect(transform.x).toBe(0);
  });

  it('resizes and rounds values', () => {
    const transform = resizeTransform(defaultTransform(10, 10), 33.3, 44.4);
    const rounded = roundTransform(transform);
    expect(rounded.width).toBe(33);
    expect(rounded.height).toBe(44);
  });
});
