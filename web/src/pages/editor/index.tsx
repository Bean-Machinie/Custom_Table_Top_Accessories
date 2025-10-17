import { useEffect, useMemo, useState } from 'react';

import { EditorPlayground } from '../../components/editor/playground';
import { Sidebar, Toolbar } from '../../components/ui/panel';
import { DocumentNavigator } from '../../features/documents/document-navigator';
import { FileMenu } from '../../features/documents/file-menu';
import { LayersPanel } from '../../features/layers/layers-panel';
import { ViewportControls } from '../../features/viewports/viewport-controls';
import { useEditorState } from '../../stores/editor-store';

const EditorPage = () => {
  const { activeDocumentId, documents } = useEditorState();
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    setSelectedLayerId(null);
  }, [activeDocumentId]);

  const activeDocument = useMemo(() => {
    if (!activeDocumentId) return null;
    return documents[activeDocumentId] ?? null;
  }, [activeDocumentId, documents]);

  return (
    <div className="flex h-full flex-col">
      <Toolbar className="justify-between">
        <div className="flex items-center gap-3">
          <FileMenu showGrid={showGrid} onShowGridChange={setShowGrid} />
        </div>
        <ViewportControls />
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
