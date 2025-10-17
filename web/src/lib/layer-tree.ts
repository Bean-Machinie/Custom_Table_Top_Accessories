import type { Layer } from '@shared/index';

export interface LayerTreeNode extends Layer {
  children: LayerTreeNode[];
}

export interface FlattenedLayerNode {
  layer: Layer;
  depth: number;
  hasChildren: boolean;
}

const cloneLayers = (layers: Layer[]): Layer[] => layers.map((layer) => ({ ...layer }));

const collectByParent = (layers: Layer[]) => {
  const groups = new Map<string | null, Layer[]>();
  for (const layer of layers) {
    const parentKey = layer.parentId ?? null;
    if (!groups.has(parentKey)) {
      groups.set(parentKey, []);
    }
    groups.get(parentKey)!.push(layer);
  }
  return groups;
};

export const normalizeLayerOrder = (layers: Layer[]): Layer[] => {
  const next = cloneLayers(layers);
  const byParent = collectByParent(next);

  const assignOrders = (parentId: string | null) => {
    const siblings = [...(byParent.get(parentId) ?? [])];
    siblings.sort((a, b) => a.order - b.order);
    const ordered =
      parentId === null
        ? [
            ...siblings.filter((layer) => layer.type === 'base'),
            ...siblings.filter((layer) => layer.type !== 'base')
          ]
        : siblings;
    ordered.forEach((layer, index) => {
      layer.order = index;
      assignOrders(layer.id);
    });
  };

  assignOrders(null);
  return next;
};

export const ensureBaseCanvasInvariant = (layers: Layer[]): Layer[] => {
  const next = normalizeLayerOrder(layers);
  for (const layer of next) {
    if (layer.type === 'base') {
      layer.locked = true;
      layer.visible = true;
      layer.parentId = null;
      layer.name = 'Base Canvas';
    }
  }
  return normalizeLayerOrder(next);
};

export const buildLayerTree = (layers: Layer[]): LayerTreeNode[] => {
  const normalized = normalizeLayerOrder(layers);
  const nodeMap = new Map<string, LayerTreeNode>();
  normalized.forEach((layer) => {
    nodeMap.set(layer.id, { ...layer, children: [] });
  });
  const roots: LayerTreeNode[] = [];
  nodeMap.forEach((node) => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      node.parentId = null;
      roots.push(node);
    }
  });

  const sortChildren = (nodes: LayerTreeNode[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach((child) => sortChildren(child.children));
  };

  sortChildren(roots);

  const base = roots.filter((node) => node.type === 'base');
  const others = roots.filter((node) => node.type !== 'base');
  return [...others, ...base];
};

export const flattenLayerTree = (layers: Layer[]): FlattenedLayerNode[] => {
  const tree = buildLayerTree(layers);
  const result: FlattenedLayerNode[] = [];

  const walk = (nodes: LayerTreeNode[], depth: number) => {
    nodes.forEach((node) => {
      result.push({ layer: node, depth, hasChildren: node.children.length > 0 });
      if (!node.collapsed) {
        walk(node.children, depth + 1);
      }
    });
  };

  walk(tree, 0);
  return result;
};

export const collectDescendantIds = (layers: Layer[], layerId: string): string[] => {
  const tree = buildLayerTree(layers);
  const result: string[] = [];
  const visit = (nodes: LayerTreeNode[]) => {
    for (const node of nodes) {
      if (node.id === layerId) {
        const collect = (childNodes: LayerTreeNode[]) => {
          for (const child of childNodes) {
            result.push(child.id);
            collect(child.children);
          }
        };
        collect(node.children);
        return true;
      }
      if (visit(node.children)) {
        return true;
      }
    }
    return false;
  };
  visit(tree);
  return result;
};

export const getLayerAncestors = (layers: Layer[], layerId: string): Layer[] => {
  const map = new Map(layers.map((layer) => [layer.id, layer]));
  const ancestors: Layer[] = [];
  let current = map.get(layerId);
  while (current?.parentId) {
    const parent = map.get(current.parentId);
    if (!parent) break;
    ancestors.push(parent);
    current = parent;
  }
  return ancestors;
};

export const isDescendantOf = (
  layers: Layer[],
  ancestorId: string,
  possibleDescendantId: string | null
): boolean => {
  if (!possibleDescendantId) return false;
  if (ancestorId === possibleDescendantId) return true;
  const ancestors = getLayerAncestors(layers, possibleDescendantId);
  return ancestors.some((layer) => layer.id === ancestorId);
};

export const moveLayer = (
  layers: Layer[],
  layerId: string,
  targetParentId: string | null,
  targetIndex: number
): Layer[] => {
  const normalized = normalizeLayerOrder(layers).map((layer) => ({ ...layer }));
  const layer = normalized.find((entry) => entry.id === layerId);
  if (!layer || layer.type === 'base') {
    return layers;
  }

  const targetParent = targetParentId ?? null;
  if (isDescendantOf(normalized, layer.id, targetParent)) {
    return normalized;
  }

  const sourceParent = layer.parentId ?? null;
  const adjustOrders = (parentId: string | null, excludeId?: string) => {
    const siblings = normalized
      .filter((entry) => (entry.parentId ?? null) === parentId && entry.id !== excludeId)
      .sort((a, b) => a.order - b.order);
    siblings.forEach((entry, index) => {
      entry.order = index;
    });
  };

  adjustOrders(sourceParent, layer.id);

  layer.parentId = targetParent;
  adjustOrders(targetParent, layer.id);

  const siblings = normalized
    .filter((entry) => (entry.parentId ?? null) === targetParent && entry.id !== layer.id)
    .sort((a, b) => a.order - b.order);
  const clampedIndex = Math.max(0, Math.min(targetIndex, siblings.length));
  siblings.splice(clampedIndex, 0, layer);
  siblings.forEach((entry, index) => {
    entry.order = index;
  });

  return ensureBaseCanvasInvariant(normalized);
};

export const cascadeVisibility = (layers: Layer[], rootId: string, visible: boolean): Layer[] => {
  const normalized = normalizeLayerOrder(layers).map((layer) => ({ ...layer }));
  const ids = [rootId, ...collectDescendantIds(normalized, rootId)];
  return normalized.map((layer) => (ids.includes(layer.id) ? { ...layer, visible } : layer));
};

export const duplicateLayerBranch = (
  layers: Layer[],
  layerId: string,
  createId: () => string
): Layer[] => {
  const normalized = normalizeLayerOrder(layers);
  const target = normalized.find((layer) => layer.id === layerId);
  if (!target || target.type === 'base') {
    return layers;
  }

  const tree = buildLayerTree(normalized);
  const clones = cloneLayers(normalized);
  const cloneMap = new Map(clones.map((layer) => [layer.id, layer]));

  const findNode = (nodes: LayerTreeNode[]): LayerTreeNode | null => {
    for (const node of nodes) {
      if (node.id === layerId) return node;
      const child = findNode(node.children);
      if (child) return child;
    }
    return null;
  };

  const node = findNode(tree);
  if (!node) return layers;

  const insertParentId = node.parentId ?? null;
  const insertOrder = node.order + 1;

  const createClone = (original: Layer, parentId: string | null): Layer => {
    const id = createId();
    const baseName = original.name.replace(/ copy( \d+)?$/i, '');
    const copyName = `${baseName} copy`;
    return {
      ...original,
      id,
      name: copyName,
      order: original.order,
      parentId,
      collapsed: original.collapsed
    };
  };

  const cloneBranch = (source: LayerTreeNode, parentId: string | null) => {
    const clone = createClone(source, parentId);
    cloneMap.set(clone.id, clone);
    source.children.forEach((child) => {
      cloneBranch({ ...child, children: child.children }, clone.id);
    });
  };

  const rootClone = createClone(node, insertParentId);
  cloneMap.set(rootClone.id, rootClone);
  node.children.forEach((child) => cloneBranch(child, rootClone.id));

  const updated = Array.from(cloneMap.values());
  const withPlacement = moveLayer(updated, rootClone.id, insertParentId, insertOrder);
  return ensureBaseCanvasInvariant(withPlacement);
};

export const removeLayerBranch = (layers: Layer[], layerId: string): Layer[] => {
  const normalized = normalizeLayerOrder(layers);
  const idsToRemove = new Set([layerId, ...collectDescendantIds(normalized, layerId)]);
  const remaining = normalized.filter((layer) => !idsToRemove.has(layer.id));
  return ensureBaseCanvasInvariant(remaining);
};

export const toggleCollapse = (layers: Layer[], layerId: string, collapsed: boolean): Layer[] => {
  return layers.map((layer) => (layer.id === layerId ? { ...layer, collapsed } : layer));
};

export const getLayerDepth = (layers: Layer[], layerId: string): number => {
  return getLayerAncestors(layers, layerId).length;
};

export const flattenLayersForRender = (layers: Layer[]): Layer[] => {
  const tree = buildLayerTree(layers);
  const result: Layer[] = [];
  const walk = (nodes: LayerTreeNode[]) => {
    nodes.forEach((node) => {
      if (node.type !== 'group') {
        result.push(node);
      }
      if (node.children.length > 0) {
        walk(node.children);
      }
    });
  };
  walk(tree);
  return result;
};

export const findLayerById = (layers: Layer[], id: string) => layers.find((layer) => layer.id === id);
