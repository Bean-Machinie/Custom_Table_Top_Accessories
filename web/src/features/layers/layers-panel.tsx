import type { Layer } from '@shared/index';
import { useMemo } from 'react';

import { IconButton } from '../../components/ui/button';
import { Panel } from '../../components/ui/panel';
import { Toggle } from '../../components/ui/toggle';
import { useEditorDispatch, useEditorState } from '../../stores/editor-store';

import { AddLayerButton } from './add-layer-button';

interface LayersPanelProps {
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
}

export const LayersPanel = ({ selectedLayerId, onSelectLayer }: LayersPanelProps) => {
  const { activeDocumentId, documents } = useEditorState();
  const dispatch = useEditorDispatch();
  const document = activeDocumentId ? documents[activeDocumentId] : null;

  const layers = useMemo(() => {
    if (!document) return [] as Layer[];
    return [...document.layers].sort((a, b) => a.order - b.order);
  }, [document]);

  if (!document) {
    return (
      <Panel padding="sm" className="text-sm text-muted">
        Select or create a document to manage layers.
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel padding="sm" className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Layers</h3>
        <ul className="flex flex-col gap-1">
          {layers.map((layer) => (
            <li key={layer.id}>
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition focus-visible:focus-ring ${
                  selectedLayerId === layer.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/10'
                }`}
                onClick={() => onSelectLayer(layer.id)}
                disabled={layer.locked}
              >
                <span className="flex flex-col">
                  <span className="font-medium">{layer.name}</span>
                  <span className="text-xs text-muted">
                    {layer.type === 'base' ? 'Locked base canvas' : `${Math.round(layer.transform.width)} × ${Math.round(layer.transform.height)}`}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Toggle
                    aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                    pressed={layer.visible}
                    onClick={(event) => {
                      event.stopPropagation();
                      dispatch({
                        type: 'update-layer',
                        documentId: document.id,
                        layerId: layer.id,
                        layer: { visible: !layer.visible }
                      });
                    }}
                  >
                    {layer.visible ? 'Visible' : 'Hidden'}
                  </Toggle>
                  {!layer.locked && (
                    <div className="flex items-center gap-1">
                      <IconButton
                        label="Move layer up"
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          dispatch({ type: 'reorder-layer', documentId: document.id, layerId: layer.id, direction: 'up' });
                        }}
                      >
                        ↑
                      </IconButton>
                      <IconButton
                        label="Move layer down"
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          dispatch({ type: 'reorder-layer', documentId: document.id, layerId: layer.id, direction: 'down' });
                        }}
                      >
                        ↓
                      </IconButton>
                    </div>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel padding="sm">
        <AddLayerButton />
      </Panel>
    </div>
  );
};
