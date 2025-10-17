import type { EditorViewportState } from '@shared/index';
import { createContext, ReactNode, useContext, useEffect, useMemo, useReducer } from 'react';

import { loadViewport, persistViewport } from '../lib/persistence';

interface ViewportActionUpdate {
  type: 'update';
  viewport: Partial<EditorViewportState>;
}

type ViewportAction = ViewportActionUpdate | { type: 'reset' } | { type: 'hydrate'; state: EditorViewportState | null };

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
    default:
      return state;
  }
};

export const ViewportProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, defaultViewport);

  useEffect(() => {
    dispatch({ type: 'hydrate', state: loadViewport() });
  }, []);

  useEffect(() => {
    persistViewport(state);
  }, [state]);

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
