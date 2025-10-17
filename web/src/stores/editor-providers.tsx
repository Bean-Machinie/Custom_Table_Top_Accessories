import { ReactNode, useEffect, useMemo } from 'react';

import { createDatabaseAdapter } from '../adapters/database-adapter';
import { loadSnapshot, persistSnapshot } from '../lib/persistence';

import { createFrameDocument, EditorStoreProvider, useEditorDispatch, useEditorState } from './editor-store';
import { ViewportProvider } from './viewport-store';

const autosaveDelay = 800;

const PersistenceManager = ({ children }: { children: ReactNode }) => {
  const state = useEditorState();
  const dispatch = useEditorDispatch();
  const databaseAdapter = useMemo(() => createDatabaseAdapter(), []);

  useEffect(() => {
    dispatch({ type: 'hydrate', snapshot: loadSnapshot() });
  }, [dispatch]);

  useEffect(() => {
    if (!state.activeDocumentId && Object.keys(state.documents).length === 0) {
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
    }
  }, [dispatch, state.activeDocumentId, state.documents]);

  useEffect(() => {
    persistSnapshot({
      activeDocumentId: state.activeDocumentId,
      documents: state.documents
    });
  }, [state.activeDocumentId, state.documents]);

  useEffect(() => {
    if (!state.activeDocumentId) return;
    const document = state.documents[state.activeDocumentId];
    if (!document) return;
    if (!state.dirty.has(document.id)) return;

    const timer = window.setTimeout(() => {
      databaseAdapter
        .saveFrame(document)
        .then(() => dispatch({ type: 'mark-clean', documentId: document.id }))
        .catch((error) => console.error('Failed to save frame', error));
    }, autosaveDelay);

    return () => window.clearTimeout(timer);
  }, [databaseAdapter, dispatch, state.activeDocumentId, state.documents, state.dirty]);

  return <>{children}</>;
};

export const EditorProviders = ({ children }: { children: ReactNode }) => (
  <EditorStoreProvider>
    <ViewportProvider>
      <PersistenceManager>{children}</PersistenceManager>
    </ViewportProvider>
  </EditorStoreProvider>
);
