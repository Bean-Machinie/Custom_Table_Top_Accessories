import type { DocumentStoreSnapshot, EditorViewportState } from '@shared/index';

const snapshotKey = 'cta::document-store';
const viewportKey = 'cta::viewport';

export const loadSnapshot = (): DocumentStoreSnapshot | null => {
  const raw = localStorage.getItem(snapshotKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DocumentStoreSnapshot;
  } catch (error) {
    console.error('Failed to parse snapshot', error);
    return null;
  }
};

export const persistSnapshot = (snapshot: DocumentStoreSnapshot) => {
  localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
};

export const loadViewport = (): EditorViewportState | null => {
  const raw = localStorage.getItem(viewportKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EditorViewportState;
  } catch (error) {
    console.error('Failed to parse viewport', error);
    return null;
  }
};

export const persistViewport = (viewport: EditorViewportState) => {
  localStorage.setItem(viewportKey, JSON.stringify(viewport));
};
