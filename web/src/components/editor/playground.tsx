import type { FrameDocument, Layer, Transform } from '@shared/index';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
  type WheelEvent as ReactWheelEvent
} from 'react';

import { createAssetStoreAdapter } from '../../adapters/asset-adapter';
import { transformToCss } from '../../lib/transform';
import { createLayer, useEditorDispatch } from '../../stores/editor-store';
import { useViewportDispatch, useViewportState } from '../../stores/viewport-store';

interface EditorPlaygroundProps {
  document: FrameDocument;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  showGrid: boolean;
}

type PointerMode =
  | { type: 'idle' }
  | { type: 'pan'; startX: number; startY: number; offsetX: number; offsetY: number }
  | { type: 'move'; layerId: string; startX: number; startY: number; transform: Transform }
  | { type: 'resize'; layerId: string; startX: number; startY: number; transform: Transform; corner: 'se' | 'nw' }
  | { type: 'rotate'; layerId: string; startX: number; startY: number; transform: Transform };

const sortLayers = (layers: Layer[]) => [...layers].sort((a, b) => a.order - b.order);

export const EditorPlayground = ({ document, selectedLayerId, onSelectLayer, showGrid }: EditorPlaygroundProps) => {
  const viewport = useViewportState();
  const viewportDispatch = useViewportDispatch();
  const dispatch = useEditorDispatch();
  const adapter = useMemo(() => createAssetStoreAdapter(), []);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pointerMode, setPointerMode] = useState<PointerMode>({ type: 'idle' });
  const [spacePressed, setSpacePressed] = useState(false);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(true);
      }
      if (selectedLayerId && (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        const layer = document.layers.find((entry) => entry.id === selectedLayerId);
        if (!layer || layer.locked) return;
        const delta = event.shiftKey ? 10 : 1;
        const dx = event.key === 'ArrowRight' ? delta : event.key === 'ArrowLeft' ? -delta : 0;
        const dy = event.key === 'ArrowDown' ? delta : event.key === 'ArrowUp' ? -delta : 0;
        dispatch({
          type: 'update-transform',
          documentId: document.id,
          layerId: layer.id,
          transform: { ...layer.transform, x: layer.transform.x + dx, y: layer.transform.y + dy }
        });
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [dispatch, document, selectedLayerId]);

  useEffect(() => {
    liveRegionRef.current?.setAttribute('aria-live', 'polite');
    liveRegionRef.current?.setAttribute('aria-atomic', 'true');
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = `Zoom ${Math.round(viewport.zoom * 100)} percent`;
    }
  }, [viewport.zoom]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    if (event.button === 1 || spacePressed || event.button === 2) {
      setPointerMode({
        type: 'pan',
        startX: event.clientX,
        startY: event.clientY,
        offsetX: viewport.offsetX,
        offsetY: viewport.offsetY
      });
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
      return;
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerMode.type === 'pan') {
      const dx = (event.clientX - pointerMode.startX) / viewport.zoom;
      const dy = (event.clientY - pointerMode.startY) / viewport.zoom;
      viewportDispatch({
        type: 'update',
        viewport: {
          offsetX: pointerMode.offsetX + dx,
          offsetY: pointerMode.offsetY + dy
        }
      });
    }
  };

  const handlePointerUp = () => {
    setPointerMode({ type: 'idle' });
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey) {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      viewportDispatch({
        type: 'update',
        viewport: { zoom: Math.min(Math.max(viewport.zoom * delta, 0.1), 8) }
      });
    }
  };

  const handleDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!event.dataTransfer.files.length) return;
    const file = event.dataTransfer.files[0];
    try {
      const url = await adapter.upload(file);
      const layer = createLayer({
        name: file.name,
        type: 'image',
        order: document.layers.length,
        baseWidth: document.width / 2,
        baseHeight: document.height / 2,
        assetUrl: url
      });
      dispatch({ type: 'add-layer', documentId: document.id, layer });
    } catch (error) {
      console.error('Failed to upload dropped asset', error);
      alert('Unable to upload image. Check your Supabase configuration.');
    }
  };

  const handleDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const layers = sortLayers(document.layers);

  return (
    <div className="relative h-full flex-1 overflow-hidden" onWheel={handleWheel}>
      <div className="sr-only" aria-live="polite" ref={liveRegionRef} />
      <div
        ref={containerRef}
        className="relative h-full w-full cursor-crosshair overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div
          className={`absolute left-1/2 top-1/2 min-h-full min-w-full origin-top-left ${showGrid ? 'grid-background' : ''}`}
          style={{
            transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})`
          }}
          onClick={() => onSelectLayer(null)}
        >
          <div
            className="relative"
            style={{ width: document.width, height: document.height, backgroundColor: document.baseColor }}
          >
            {layers.map((layer) => (
              <LayerNode
                key={layer.id}
                layer={layer}
                documentId={document.id}
                selected={layer.id === selectedLayerId}
                onSelect={onSelectLayer}
                viewportZoom={viewport.zoom}
                dispatchTransform={(transform) =>
                  dispatch({
                    type: 'update-transform',
                    documentId: document.id,
                    layerId: layer.id,
                    transform
                  })
                }
                setPointerMode={setPointerMode}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface LayerNodeProps {
  layer: Layer;
  documentId: string;
  selected: boolean;
  viewportZoom: number;
  onSelect: (layerId: string | null) => void;
  dispatchTransform: (transform: Transform) => void;
  setPointerMode: Dispatch<SetStateAction<PointerMode>>;
}

const LayerNode = ({
  layer,
  selected,
  viewportZoom,
  onSelect,
  dispatchTransform,
  setPointerMode
}: LayerNodeProps) => {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const handleMovePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (layer.locked) return;
    event.stopPropagation();
    onSelect(layer.id);
    setPointerMode({
      type: 'move',
      layerId: layer.id,
      startX: event.clientX,
      startY: event.clientY,
      transform: layer.transform
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  useEffect(() => {
    return () => {
      setPointerMode({ type: 'idle' });
    };
  }, [setPointerMode]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      setPointerMode((mode) => {
        if (mode.type === 'move' && mode.layerId === layer.id) {
          const dx = (event.clientX - mode.startX) / viewportZoom;
          const dy = (event.clientY - mode.startY) / viewportZoom;
          dispatchTransform({ ...mode.transform, x: mode.transform.x + dx, y: mode.transform.y + dy });
        }
        if (mode.type === 'resize' && mode.layerId === layer.id) {
          const dx = (event.clientX - mode.startX) / viewportZoom;
          const dy = (event.clientY - mode.startY) / viewportZoom;
          const width = Math.max(32, mode.transform.width + (mode.corner === 'se' ? dx : -dx));
          const height = Math.max(32, mode.transform.height + (mode.corner === 'se' ? dy : -dy));
          const x = mode.corner === 'nw' ? mode.transform.x + dx : mode.transform.x;
          const y = mode.corner === 'nw' ? mode.transform.y + dy : mode.transform.y;
          dispatchTransform({ ...mode.transform, width, height, x, y });
        }
        if (mode.type === 'rotate' && mode.layerId === layer.id && nodeRef.current) {
          const rect = nodeRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const angle = (Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) / Math.PI;
          dispatchTransform({ ...mode.transform, rotation: angle });
        }
        return mode;
      });
    };
    const handleUp = () => {
      setPointerMode({ type: 'idle' });
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dispatchTransform, layer.id, setPointerMode, viewportZoom]);

  const handleResizePointerDown = (corner: 'se' | 'nw') => (event: React.PointerEvent<HTMLDivElement>) => {
    if (layer.locked) return;
    event.stopPropagation();
    onSelect(layer.id);
    setPointerMode({
      type: 'resize',
      layerId: layer.id,
      startX: event.clientX,
      startY: event.clientY,
      transform: layer.transform,
      corner
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleRotatePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (layer.locked) return;
    event.stopPropagation();
    onSelect(layer.id);
    setPointerMode({
      type: 'rotate',
      layerId: layer.id,
      startX: event.clientX,
      startY: event.clientY,
      transform: layer.transform
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const style = transformToCss(layer.transform);

  return (
    <div className="absolute" style={style} ref={nodeRef}>
      {layer.type === 'image' && layer.assetUrl ? (
        <img src={layer.assetUrl} alt={layer.name} className="h-full w-full rounded-md object-contain" draggable={false} />
      ) : (
        <div className="h-full w-full rounded-md border border-border/40" />
      )}
      {selected && !layer.locked && (
        <div
          className="absolute inset-0 border-2 border-accent"
          role="presentation"
          onPointerDown={handleMovePointerDown}
        >
          <div
            className="absolute -bottom-1 -right-1 h-4 w-4 cursor-se-resize rounded-full border border-border/60 bg-background"
            onPointerDown={handleResizePointerDown('se')}
          />
          <div
            className="absolute -top-1 -left-1 h-4 w-4 cursor-nw-resize rounded-full border border-border/60 bg-background"
            onPointerDown={handleResizePointerDown('nw')}
          />
          <div
            className="absolute left-1/2 -top-6 h-4 w-4 -translate-x-1/2 cursor-alias rounded-full border border-border/60 bg-background"
            onPointerDown={handleRotatePointerDown}
          />
        </div>
      )}
    </div>
  );
};
