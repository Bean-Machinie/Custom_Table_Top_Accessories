import type {
  CreateDocumentInput,
  DocumentStoreSnapshot,
  FrameDocument,
  Layer,
  LayerType,
  Transform
} from '@shared/index';
import { createContext, Dispatch, ReactNode, useContext, useReducer } from 'react';

import { nanoid } from '../lib/nanoid';
import {
  cascadeVisibility,
  duplicateLayerBranch,
  ensureBaseCanvasInvariant,
  moveLayer,
  removeLayerBranch,
  toggleCollapse
} from '../lib/layer-tree';
import { defaultTransform, resizeTransform } from '../lib/transform';

interface EditorState {
  activeDocumentId: string | null;
  documents: Record<string, FrameDocument>;
  dirty: Set<string>;
}

type EditorAction =
  | { type: 'hydrate'; snapshot: DocumentStoreSnapshot | null }
  | { type: 'new-document'; document: FrameDocument }
  | { type: 'set-active-document'; documentId: string }
  | { type: 'update-layer'; documentId: string; layerId: string; layer: Partial<Layer> }
  | { type: 'update-transform'; documentId: string; layerId: string; transform: Transform }
  | { type: 'update-layer-transforms'; documentId: string; updates: { layerId: string; transform: Transform }[] }
  | { type: 'add-layer'; documentId: string; layer: Layer }
  | { type: 'remove-layer'; documentId: string; layerId: string }
  | { type: 'remove-layers'; documentId: string; layerIds: string[] }
  | {
      type: 'move-layer';
      documentId: string;
      layerId: string;
      targetParentId: string | null;
      targetIndex: number;
    }
  | { type: 'group-layers'; documentId: string; layerIds: string[]; name?: string }
  | { type: 'ungroup-layer'; documentId: string; layerId: string }
  | { type: 'toggle-layer-collapse'; documentId: string; layerId: string; collapsed: boolean }
  | { type: 'duplicate-layer'; documentId: string; layerId: string }
  | { type: 'mark-clean'; documentId: string };

const EditorStateContext = createContext<EditorState | undefined>(undefined);
const EditorDispatchContext = createContext<Dispatch<EditorAction> | undefined>(undefined);

const ensureDocument = (state: EditorState, documentId: string) => {
  const document = state.documents[documentId];
  if (!document) throw new Error(`Document ${documentId} missing`);
  return document;
};

const createBaseLayer = (width: number, height: number): Layer => ({
  id: nanoid(),
  name: 'Base Canvas',
  type: 'base',
  order: 0,
  visible: true,
  locked: true,
  parentId: null,
  collapsed: false,
  transform: resizeTransform(defaultTransform(width, height), width, height),
  assetUrl: undefined
});

export const createFrameDocument = (input: CreateDocumentInput): FrameDocument => {
  const now = new Date().toISOString();
  const id = nanoid();
  return {
    id,
    width: input.width,
    height: input.height,
    dpi: input.dpi,
    baseColor: input.baseColor,
    paperColor: input.paperColor,
    layers: [createBaseLayer(input.width, input.height)],
    metadata: {
      id,
      name: input.name,
      createdAt: now,
      updatedAt: now,
      revision: 0
    }
  };
};

const createEmptyState = (): EditorState => ({
  activeDocumentId: null,
  documents: {},
  dirty: new Set()
});

const withDirty = (state: EditorState, documentId: string, document: FrameDocument): EditorState => ({
  ...state,
  documents: {
    ...state.documents,
    [document.id]: document
  },
  dirty: new Set(state.dirty).add(documentId)
});

const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'hydrate': {
      if (!action.snapshot) {
        return createEmptyState();
      }
      return {
        activeDocumentId: action.snapshot.activeDocumentId,
        documents: action.snapshot.documents,
        dirty: new Set(Object.keys(action.snapshot.documents))
      };
    }
    case 'new-document': {
      return {
        activeDocumentId: action.document.id,
        documents: {
          ...state.documents,
          [action.document.id]: action.document
        },
        dirty: new Set(state.dirty).add(action.document.id)
      };
    }
    case 'set-active-document': {
      if (!state.documents[action.documentId]) return state;
      return {
        ...state,
        activeDocumentId: action.documentId
      };
    }
    case 'update-layer': {
      const document = ensureDocument(state, action.documentId);
      const target = document.layers.find((layer) => layer.id === action.layerId);
      if (!target) return state;
      let layers: Layer[];
      if (target.type === 'base') {
        layers = document.layers.map((layer) =>
          layer.id === target.id
            ? { ...layer, name: 'Base Canvas', parentId: null, locked: true, visible: true }
            : layer
        );
      } else {
        layers = document.layers.map((layer) =>
          layer.id === target.id ? { ...layer, ...action.layer } : layer
        );
        if (target.type === 'group' && action.layer.visible !== undefined) {
          layers = cascadeVisibility(layers, target.id, Boolean(action.layer.visible));
        }
      }
      const normalized = ensureBaseCanvasInvariant(layers);
      return withDirty(state, document.id, { ...document, layers: normalized });
    }
    case 'update-transform': {
      const document = ensureDocument(state, action.documentId);
      const layers = document.layers.map((layer) =>
        layer.id === action.layerId ? { ...layer, transform: action.transform } : layer
      );
      return withDirty(state, document.id, {
        ...document,
        layers: ensureBaseCanvasInvariant(layers)
      });
    }
    case 'update-layer-transforms': {
      const document = ensureDocument(state, action.documentId);
      const updates = new Map(action.updates.map((update) => [update.layerId, update.transform]));
      const layers = document.layers.map((layer) =>
        updates.has(layer.id) ? { ...layer, transform: updates.get(layer.id)! } : layer
      );
      return withDirty(state, document.id, {
        ...document,
        layers: ensureBaseCanvasInvariant(layers)
      });
    }
    case 'add-layer': {
      const document = ensureDocument(state, action.documentId);
      const layers = ensureBaseCanvasInvariant([...document.layers, action.layer]);
      return withDirty(state, document.id, { ...document, layers });
    }
    case 'remove-layer': {
      const document = ensureDocument(state, action.documentId);
      const layer = document.layers.find((entry) => entry.id === action.layerId);
      if (!layer || layer.type === 'base') return state;
      const layers = removeLayerBranch(document.layers, action.layerId);
      return withDirty(state, document.id, { ...document, layers });
    }
    case 'remove-layers': {
      const document = ensureDocument(state, action.documentId);
      let layers = document.layers;
      for (const layerId of action.layerIds) {
        const target = layers.find((layer) => layer.id === layerId);
        if (!target || target.type === 'base') continue;
        layers = removeLayerBranch(layers, layerId);
      }
      return withDirty(state, document.id, { ...document, layers });
    }
    case 'move-layer': {
      const document = ensureDocument(state, action.documentId);
      const layer = document.layers.find((entry) => entry.id === action.layerId);
      if (!layer || layer.type === 'base') return state;
      const layers = moveLayer(
        document.layers,
        action.layerId,
        action.targetParentId,
        action.targetIndex
      );
      return withDirty(state, document.id, { ...document, layers });
    }
    case 'group-layers': {
      const document = ensureDocument(state, action.documentId);
      const uniqueIds = Array.from(new Set(action.layerIds));
      const selected = uniqueIds
        .map((id) => document.layers.find((layer) => layer.id === id))
        .filter((layer): layer is Layer => Boolean(layer && layer.type !== 'base'));
      if (selected.length < 2) return state;
      const parentId = selected.every((layer) => layer.parentId === selected[0]?.parentId)
        ? selected[0]?.parentId ?? null
        : null;
      const order = Math.min(...selected.map((layer) => layer.order));
      const groupLayer: Layer = {
        id: nanoid(),
        name: action.name ?? 'Group',
        type: 'group',
        order,
        visible: selected.every((layer) => layer.visible),
        locked: false,
        parentId,
        collapsed: false,
        transform: selected[0]?.transform ?? createBaseLayer(1, 1).transform
      };
      const withoutSelected = document.layers.map((layer) =>
        selected.some((entry) => entry.id === layer.id)
          ? { ...layer, parentId: groupLayer.id }
          : layer
      );
      const layers = ensureBaseCanvasInvariant([...withoutSelected, groupLayer]);
      return withDirty(state, document.id, { ...document, layers });
    }
    case 'ungroup-layer': {
      const document = ensureDocument(state, action.documentId);
      const group = document.layers.find((layer) => layer.id === action.layerId && layer.type === 'group');
      if (!group) return state;
      const layers = document.layers.map((layer) => {
        if (layer.parentId === group.id) {
          return { ...layer, parentId: group.parentId };
        }
        return layer;
      });
      const remaining = ensureBaseCanvasInvariant(
        layers.filter((layer) => layer.id !== group.id)
      );
      return withDirty(state, document.id, { ...document, layers: remaining });
    }
    case 'toggle-layer-collapse': {
      const document = ensureDocument(state, action.documentId);
      const layers = toggleCollapse(document.layers, action.layerId, action.collapsed);
      return withDirty(state, document.id, {
        ...document,
        layers: ensureBaseCanvasInvariant(layers)
      });
    }
    case 'duplicate-layer': {
      const document = ensureDocument(state, action.documentId);
      const layers = duplicateLayerBranch(document.layers, action.layerId, nanoid);
      return withDirty(state, document.id, { ...document, layers });
    }
    case 'mark-clean': {
      const dirty = new Set(state.dirty);
      dirty.delete(action.documentId);
      return { ...state, dirty };
    }
    default:
      return state;
  }
};

const initialState: EditorState = createEmptyState();

export const EditorStoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const contextState = { ...state, dirty: new Set(state.dirty) };
  return (
    <EditorStateContext.Provider value={contextState}>
      <EditorDispatchContext.Provider value={dispatch}>
        {children}
      </EditorDispatchContext.Provider>
    </EditorStateContext.Provider>
  );
};

export const useEditorState = () => {
  const context = useContext(EditorStateContext);
  if (!context) {
    throw new Error('useEditorState must be used within EditorStoreProvider');
  }
  return context;
};

export const useEditorDispatch = () => {
  const context = useContext(EditorDispatchContext);
  if (!context) {
    throw new Error('useEditorDispatch must be used within EditorStoreProvider');
  }
  return context;
};

export const createLayer = (params: {
  name: string;
  type: LayerType;
  order: number;
  baseWidth: number;
  baseHeight: number;
  assetUrl?: string;
  parentId?: string | null;
}): Layer => ({
  id: nanoid(),
  name: params.name,
  type: params.type,
  order: params.order,
  visible: true,
  locked: params.type === 'base',
  parentId: params.parentId ?? null,
  collapsed: false,
  transform: resizeTransform(
    defaultTransform(params.baseWidth, params.baseHeight),
    params.baseWidth,
    params.baseHeight
  ),
  assetUrl: params.assetUrl
});
