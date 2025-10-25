import { describe, expect, it } from 'vitest';

import { clientToDocumentPoint, documentToClientPoint } from '../pointer-math';

const createRect = (overrides: Partial<DOMRect> = {}): DOMRect => ({
  x: 100,
  y: 200,
  width: 400,
  height: 300,
  top: 200,
  left: 100,
  bottom: 500,
  right: 500,
  toJSON: () => ({}),
  ...overrides
});

describe('pointer math', () => {
  it('converts client coordinates to document coordinates at 100% zoom', () => {
    const rect = createRect();
    const point = clientToDocumentPoint({ x: 300, y: 260 }, { documentRect: rect, viewport: { zoom: 1 } });
    expect(point).toEqual({ x: 200, y: 60 });
  });

  it('converts document coordinates back to client coordinates', () => {
    const rect = createRect();
    const client = documentToClientPoint({ x: 150, y: 75 }, { documentRect: rect, viewport: { zoom: 2 } });
    expect(client.x).toBeCloseTo(400);
    expect(client.y).toBeCloseTo(350);
  });
});
