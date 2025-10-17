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
  | { type: 'add-layer'; documentId: string; layer: Layer }
  | { type: 'remove-layer'; documentId: string; layerId: string }
  | { type: 'reorder-layer'; documentId: string; layerId: string; direction: 'up' | 'down' }
  | { type: 'mark-clean'; documentId: string };

const EditorStateContext = createContext<EditorState | undefined>(undefined);
const EditorDispatchContext = createContext<Dispatch<EditorAction> | undefined>(undefined);

const ensureDocument = (state: EditorState, documentId: string) => {
  const document = state.documents[documentId];
  if (!document) throw new Error(`Document ${documentId} missing`);
  return document;
};

const sortLayers = (layers: Layer[]) => [...layers].sort((a, b) => a.order - b.order);

const createBaseLayer = (width: number, height: number): Layer => ({
  id: nanoid(),
  name: 'Base Canvas',
  type: 'base',
  order: 0,
  visible: true,
  locked: true,
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
      const layers = document.layers.map((layer) =>
        layer.id === action.layerId ? { ...layer, ...action.layer } : layer
      );
      return {
        ...state,
        documents: {
          ...state.documents,
          [document.id]: {
            ...document,
            layers: sortLayers(layers)
          }
        },
        dirty: new Set(state.dirty).add(document.id)
      };
    }
    case 'update-transform': {
      const document = ensureDocument(state, action.documentId);
      const layers = document.layers.map((layer) =>
        layer.id === action.layerId ? { ...layer, transform: action.transform } : layer
      );
      return {
        ...state,
        documents: {
          ...state.documents,
          [document.id]: {
            ...document,
            layers
          }
        },
        dirty: new Set(state.dirty).add(document.id)
      };
    }
    case 'add-layer': {
      const document = ensureDocument(state, action.documentId);
      return {
        ...state,
        documents: {
          ...state.documents,
          [document.id]: {
            ...document,
            layers: sortLayers([...document.layers, action.layer])
          }
        },
        dirty: new Set(state.dirty).add(document.id)
      };
    }
    case 'remove-layer': {
      const document = ensureDocument(state, action.documentId);
      const layers = document.layers.filter((layer) => layer.id !== action.layerId);
      return {
        ...state,
        documents: {
          ...state.documents,
          [document.id]: {
            ...document,
            layers: sortLayers(layers)
          }
        },
        dirty: new Set(state.dirty).add(document.id)
      };
    }
    case 'reorder-layer': {
      const document = ensureDocument(state, action.documentId);
      const layers = sortLayers(document.layers);
      const index = layers.findIndex((layer) => layer.id === action.layerId);
      if (index < 0) return state;
      const swapWith = action.direction === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= layers.length) return state;
      const newLayers = [...layers];
      const tempOrder = newLayers[index].order;
      newLayers[index] = { ...newLayers[index], order: newLayers[swapWith].order };
      newLayers[swapWith] = { ...newLayers[swapWith], order: tempOrder };
      return {
        ...state,
        documents: {
          ...state.documents,
          [document.id]: {
            ...document,
            layers: sortLayers(newLayers)
          }
        },
        dirty: new Set(state.dirty).add(document.id)
      };
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
}): Layer => ({
  id: nanoid(),
  name: params.name,
  type: params.type,
  order: params.order,
  visible: true,
  locked: params.type === 'base',
  transform: resizeTransform(defaultTransform(params.baseWidth, params.baseHeight), params.baseWidth, params.baseHeight),
  assetUrl: params.assetUrl
});
