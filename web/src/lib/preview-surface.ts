import type { Layer, Transform } from '@shared/index';

export type TransformChange = { id: string } & Partial<Transform>;

export const getPersistedTransforms = (layers: Layer[], ids: string[]): TransformChange[] => {
  const map = new Map<string, Layer>();
  layers.forEach((layer) => {
    if (layer.visible && layer.type !== 'group' && !layer.locked) {
      map.set(layer.id, layer);
    }
  });
  return ids
    .map((id) => map.get(id))
    .filter((layer): layer is Layer => Boolean(layer))
    .map((layer) => ({ id: layer.id, ...layer.transform }));
};

export const getPreviewTransform = (
  preview: Record<string, Transform>,
  id: string
): Transform | null => preview[id] ?? null;

export const mergePreviewTransforms = (
  preview: Record<string, Transform>,
  persisted: Map<string, Transform>,
  changes: TransformChange[]
): Record<string, Transform> => {
  if (changes.length === 0) {
    return preview;
  }
  const next = { ...preview };
  for (const change of changes) {
    const base = persisted.get(change.id);
    if (!base) continue;
    next[change.id] = { ...base, ...(preview[change.id] ?? {}), ...change };
  }
  return next;
};

export const clearPreview = (): Record<string, Transform> => ({});

export const computeEffectiveTransform = (
  id: string,
  persisted: Map<string, Transform>,
  preview: Record<string, Transform>
): Transform => {
  const base = persisted.get(id);
  const overlay = preview[id];
  if (base && overlay) {
    return { ...base, ...overlay };
  }
  if (overlay) {
    return overlay;
  }
  if (base) {
    return base;
  }
  throw new Error(`Missing transform for layer ${id}`);
};

export const commitPreviewChanges = (
  persisted: Map<string, Transform>,
  changes: TransformChange[],
  fallbackPreview?: Record<string, Transform>
): { layerId: string; transform: Transform }[] => {
  const updates: { layerId: string; transform: Transform }[] = [];
  for (const change of changes) {
    const base = persisted.get(change.id) ?? fallbackPreview?.[change.id];
    if (!base) continue;
    updates.push({ layerId: change.id, transform: { ...base, ...change } });
  }
  return updates;
};
