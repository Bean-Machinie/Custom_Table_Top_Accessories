import type { DocumentStoreSnapshot, EditorViewportState } from '@shared/index';

const snapshotKey = (userId?: string) => `cta::document-store::${userId ?? 'demo'}`;
const viewportKey = (userId?: string) => `cta::viewport::${userId ?? 'demo'}`;

export const loadSnapshot = (userId?: string): DocumentStoreSnapshot | null => {
  const raw = localStorage.getItem(snapshotKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DocumentStoreSnapshot;
  } catch (error) {
    console.error('Failed to parse snapshot', error);
    return null;
  }
};

export const persistSnapshot = (snapshot: DocumentStoreSnapshot, userId?: string) => {
  localStorage.setItem(snapshotKey(userId), JSON.stringify(snapshot));
};

export const loadViewport = (userId?: string): EditorViewportState | null => {
  const raw = localStorage.getItem(viewportKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EditorViewportState;
  } catch (error) {
    console.error('Failed to parse viewport', error);
    return null;
  }
};

export const persistViewport = (viewport: EditorViewportState, userId?: string) => {
  localStorage.setItem(viewportKey(userId), JSON.stringify(viewport));
};
