import type { FrameDocument } from '@shared/index';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { createDatabaseAdapter } from '../adapters/database-adapter';
import { loadSnapshot, persistSnapshot } from '../lib/persistence';

import { createFrameDocument, EditorStoreProvider, useEditorDispatch, useEditorState } from './editor-store';
import { useAuth } from './auth-store';
import { ViewportProvider } from './viewport-store';

const autosaveDelay = 800;

export interface EditorPersistenceStatus {
  hydrated: boolean;
  remoteEnabled: boolean;
  loadError: string | null;
  saveError: string | null;
  lastSavedAt: string | null;
}

const defaultStatus: EditorPersistenceStatus = {
  hydrated: false,
  remoteEnabled: false,
  loadError: null,
  saveError: null,
  lastSavedAt: null
};

const EditorPersistenceContext = createContext<EditorPersistenceStatus>(defaultStatus);

interface PersistenceManagerProps {
  children: ReactNode;
  userId?: string;
  remoteEnabled: boolean;
}

const PersistenceManager = ({ children, userId, remoteEnabled }: PersistenceManagerProps) => {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const databaseAdapter = useMemo(
    () => createDatabaseAdapter({ userId, remoteEnabled }),
    [userId, remoteEnabled]
  );

  useEffect(() => {
    dispatch({ type: 'hydrate', snapshot: null });
    setHydrated(false);
    setLoadError(null);
    setSaveError(null);
    setLastSavedAt(null);

    const snapshot = loadSnapshot(userId);
    if (snapshot) {
      dispatch({ type: 'hydrate', snapshot });
    }

    if (!remoteEnabled) {
      setHydrated(true);
      return;
    }

    let cancelled = false;

    databaseAdapter
      .listFrames()
      .then((frames) => {
        if (cancelled) return;
        if (frames.length === 0) return;
        const documents = frames.reduce<Record<string, FrameDocument>>((acc, frame) => {
          acc[frame.id] = frame;
          return acc;
        }, {});
        const preferredId = snapshot?.activeDocumentId;
        const activeDocumentId = preferredId && documents[preferredId] ? preferredId : frames[0].id;
        dispatch({ type: 'hydrate', snapshot: { activeDocumentId, documents } });
      })
      .catch((error) => {
        console.error('Failed to load frames', error);
        if (cancelled) return;
        setLoadError('Unable to load saved frames from Supabase. Working from local data.');
      })
      .finally(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [databaseAdapter, dispatch, remoteEnabled, userId]);

  useEffect(() => {
    persistSnapshot(
      {
        activeDocumentId: state.activeDocumentId,
        documents: state.documents
      },
      userId
    );
  }, [state.activeDocumentId, state.documents, userId]);

  useEffect(() => {
    if (!hydrated) return;
    if (state.activeDocumentId) return;
    if (Object.keys(state.documents).length > 0) return;

    const name = (import.meta.env.VITE_DEFAULT_PROJECT_NAME as string | undefined) ?? 'Untitled Frame';
    const document = createFrameDocument({
      name,
      width: 1920,
      height: 1080,
      dpi: 300,
      baseColor: '#ffffff',
      paperColor: '#f8f9ff'
    });
    dispatch({ type: 'new-document', document });
  }, [dispatch, hydrated, state.activeDocumentId, state.documents]);

  useEffect(() => {
    if (!state.activeDocumentId) return;
    const document = state.documents[state.activeDocumentId];
    if (!document) return;
    if (!state.dirty.has(document.id)) return;

    const timer = window.setTimeout(() => {
      databaseAdapter
        .saveFrame(document)
        .then(() => {
          dispatch({ type: 'mark-clean', documentId: document.id });
          setSaveError(null);
          setLastSavedAt(new Date().toISOString());
        })
        .catch((error) => {
          console.error('Failed to save frame', error);
          setSaveError('Unable to save changes to Supabase. They will be retried shortly.');
        });
    }, autosaveDelay);

    return () => window.clearTimeout(timer);
  }, [databaseAdapter, dispatch, state.activeDocumentId, state.documents, state.dirty]);

  const status = useMemo<EditorPersistenceStatus>(
    () => ({
      hydrated,
      remoteEnabled,
      loadError,
      saveError,
      lastSavedAt
    }),
    [hydrated, remoteEnabled, loadError, saveError, lastSavedAt]
  );

  return <EditorPersistenceContext.Provider value={status}>{children}</EditorPersistenceContext.Provider>;
};

export const EditorProviders = ({ children }: { children: ReactNode }) => {
  const { mode, status, user } = useAuth();
  const remoteEnabled = mode === 'auth' && status === 'authenticated' && Boolean(user);
  const userId = remoteEnabled && user ? user.id : undefined;

  return (
    <EditorStoreProvider>
      <ViewportProvider userId={userId}>
        <PersistenceManager userId={userId} remoteEnabled={remoteEnabled}>
          {children}
        </PersistenceManager>
      </ViewportProvider>
    </EditorStoreProvider>
  );
};

export const useEditorPersistence = () => {
  const context = useContext(EditorPersistenceContext);
  if (!context) {
    throw new Error('useEditorPersistence must be used within EditorProviders');
  }
  return context;
};
