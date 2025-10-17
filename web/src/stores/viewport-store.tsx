import type { EditorViewportState } from '@shared/index';
import { createContext, ReactNode, useContext, useEffect, useMemo, useReducer } from 'react';

import { loadViewport, persistViewport } from '../lib/persistence';
import { type ZoomPreset, getPresetZoom, clampZoom } from '../lib/zoom-utils';

interface ViewportActionUpdate {
  type: 'update';
  viewport: Partial<EditorViewportState>;
}

interface ViewportActionZoomPreset {
  type: 'zoom-preset';
  preset: ZoomPreset;
  contentWidth: number;
  contentHeight: number;
  containerWidth: number;
  containerHeight: number;
}

type ViewportAction =
  | ViewportActionUpdate
  | ViewportActionZoomPreset
  | { type: 'reset' }
  | { type: 'hydrate'; state: EditorViewportState | null };

type ViewportState = EditorViewportState;

const defaultViewport: ViewportState = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0
};

const ViewportStateContext = createContext<ViewportState | undefined>(undefined);
const ViewportDispatchContext = createContext<React.Dispatch<ViewportAction> | undefined>(undefined);

const reducer = (state: ViewportState, action: ViewportAction): ViewportState => {
  switch (action.type) {
    case 'hydrate':
      return action.state ?? state;
    case 'reset':
      return defaultViewport;
    case 'update':
      return { ...state, ...action.viewport };
    case 'zoom-preset': {
      const zoom = clampZoom(
        getPresetZoom(
          action.preset,
          action.contentWidth,
          action.contentHeight,
          action.containerWidth,
          action.containerHeight
        )
      );
      // Center the content when applying preset
      return {
        ...state,
        zoom,
        offsetX: 0,
        offsetY: 0
      };
    }
    default:
      return state;
  }
};

export const ViewportProvider = ({ children, userId }: { children: ReactNode; userId?: string }) => {
  const [state, dispatch] = useReducer(reducer, defaultViewport);

  useEffect(() => {
    dispatch({ type: 'hydrate', state: loadViewport(userId) });
  }, [userId]);

  useEffect(() => {
    persistViewport(state, userId);
  }, [state, userId]);

  const memoState = useMemo(() => state, [state]);

  return (
    <ViewportStateContext.Provider value={memoState}>
      <ViewportDispatchContext.Provider value={dispatch}>
        {children}
      </ViewportDispatchContext.Provider>
    </ViewportStateContext.Provider>
  );
};

export const useViewportState = () => {
  const context = useContext(ViewportStateContext);
  if (!context) throw new Error('useViewportState must be used within ViewportProvider');
  return context;
};

export const useViewportDispatch = () => {
  const context = useContext(ViewportDispatchContext);
  if (!context) throw new Error('useViewportDispatch must be used within ViewportProvider');
  return context;
};
