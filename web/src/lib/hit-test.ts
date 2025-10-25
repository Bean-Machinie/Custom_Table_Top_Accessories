import type { Layer } from '@shared/index';

import { getRotatedBoundingBox, pointInPolygon } from './transform-geometry';

export interface HitTestOptions {
  includeLocked?: boolean;
}

export const hitTestLayers = (
  layers: Layer[],
  point: { x: number; y: number },
  options: HitTestOptions = {}
): Layer | null => {
  const includeLocked = options.includeLocked ?? false;
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];
    if (layer.type === 'group') continue;
    if (!layer.visible) continue;
    if (!includeLocked && (layer.locked || layer.type === 'base')) continue;
    const box = getRotatedBoundingBox(layer.transform);
    if (pointInPolygon(point, box.corners)) {
      return layer;
    }
  }
  return null;
};
