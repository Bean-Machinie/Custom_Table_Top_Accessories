import { useMemo } from 'react';

import { Panel } from '../../components/ui/panel';
import { useEditorDispatch, useEditorState } from '../../stores/editor-store';

export const DocumentNavigator = () => {
  const { documents, activeDocumentId } = useEditorState();
  const dispatch = useEditorDispatch();

  const frames = useMemo(() => Object.values(documents), [documents]);

  return (
    <Panel padding="sm" className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Frames</h3>
      <ul className="space-y-2">
        {frames.map((frame) => (
          <li key={frame.id}>
            <button
              type="button"
              onClick={() => dispatch({ type: 'set-active-document', documentId: frame.id })}
              className={`flex w-full flex-col gap-2 rounded-md border border-border/40 px-3 py-2 text-left transition hover:border-primary/60 focus-visible:focus-ring ${
                activeDocumentId === frame.id ? 'border-primary text-primary' : ''
              }`}
            >
              <span className="text-sm font-medium">{frame.metadata.name}</span>
              <span className="text-xs text-muted">{frame.width} × {frame.height} @ {frame.dpi} DPI</span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
};
