import { useEffect, useMemo, useState } from 'react';

import { EditorPlayground } from '../../components/editor/playground';
import { Sidebar, Toolbar } from '../../components/ui/panel';
import { UserMenu } from '../../features/auth/user-menu';
import { DocumentNavigator } from '../../features/documents/document-navigator';
import { FileMenu } from '../../features/documents/file-menu';
import { LayersPanel } from '../../features/layers/layers-panel';
import { ViewportControls } from '../../features/viewports/viewport-controls';
import { useEditorState } from '../../stores/editor-store';
import { useAuth } from '../../stores/auth-store';
import { useEditorPersistence } from '../../stores/editor-providers';

const EditorPage = () => {
  const { activeDocumentId, documents } = useEditorState();
  const auth = useAuth();
  const persistence = useEditorPersistence();
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    setSelectedLayerId(null);
  }, [activeDocumentId]);

  const activeDocument = useMemo(() => {
    if (!activeDocumentId) return null;
    return documents[activeDocumentId] ?? null;
  }, [activeDocumentId, documents]);

  const statusMessages = [
    auth.mode !== 'auth'
      ? {
          id: 'demo',
          tone: 'info' as const,
          message: 'Running in demo mode. Configure Supabase to enable synced personal workspaces.'
        }
      : null,
    persistence.loadError
      ? { id: 'load-error', tone: 'error' as const, message: persistence.loadError }
      : null,
    persistence.saveError
      ? { id: 'save-error', tone: 'error' as const, message: persistence.saveError }
      : null,
    persistence.lastSavedAt
      ? {
          id: 'last-saved',
          tone: 'info' as const,
          message: `Last saved ${new Date(persistence.lastSavedAt).toLocaleTimeString()}`
        }
      : null
  ].filter(Boolean) as { id: string; tone: 'info' | 'error'; message: string }[];

  return (
    <div className="flex h-full flex-col">
      {statusMessages.length > 0 && (
        <div className="space-y-1 border-b border-border/60 bg-muted/10 px-4 py-3 text-sm">
          {statusMessages.map((item) => (
            <p
              key={item.id}
              className={item.tone === 'error' ? 'text-danger' : 'text-muted'}
              role={item.tone === 'error' ? 'alert' : undefined}
            >
              {item.message}
            </p>
          ))}
        </div>
      )}
      <Toolbar className="justify-between">
        <div className="flex items-center gap-3">
          <FileMenu showGrid={showGrid} onShowGridChange={setShowGrid} />
        </div>
        <div className="flex items-center gap-3">
          <ViewportControls />
          <UserMenu />
        </div>
      </Toolbar>
      <div className="flex h-full flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeDocument ? (
            <EditorPlayground
              document={activeDocument}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              showGrid={showGrid}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted">
              Create a document from File → New to begin designing.
            </div>
          )}
        </div>
        <Sidebar>
          <DocumentNavigator />
          <LayersPanel selectedLayerId={selectedLayerId} onSelectLayer={setSelectedLayerId} />
        </Sidebar>
      </div>
    </div>
  );
};

export default EditorPage;
