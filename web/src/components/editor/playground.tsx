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
import { flattenLayersForRender, findLayerById } from '../../lib/layer-tree';
import { transformToCss } from '../../lib/transform';
import { zoomAboutPoint, clampZoom, DEFAULT_ZOOM_CONFIG } from '../../lib/zoom-utils';
import { constrainViewportWithElasticity } from '../../lib/bounds-utils';
import { createLayer, useEditorDispatch } from '../../stores/editor-store';
import { useAuth } from '../../stores/auth-store';
import { useViewportDispatch, useViewportState } from '../../stores/viewport-store';
import { useInertialPan } from '../../hooks/use-inertial-pan';
import { PlaygroundHud } from './playground-hud';

export interface EditorPlaygroundRef {
  containerRef: React.RefObject<HTMLDivElement>;
}

interface EditorPlaygroundProps {
  document: FrameDocument;
  selectedLayerIds: string[];
  onSelectLayers: (layerIds: string[]) => void;
  showGrid: boolean;
  onToggleGrid?: () => void;
  playgroundContainerRef?: React.RefObject<HTMLDivElement>;
}

type PointerMode =
  | { type: 'idle' }
  | { type: 'pan'; startX: number; startY: number; offsetX: number; offsetY: number }
  | { type: 'move'; layerId: string; startX: number; startY: number; transform: Transform }
  | { type: 'resize'; layerId: string; startX: number; startY: number; transform: Transform; corner: 'se' | 'nw' }
  | { type: 'rotate'; layerId: string; startX: number; startY: number; transform: Transform };

export const EditorPlayground = ({
  document,
  selectedLayerIds,
  onSelectLayers,
  showGrid,
  onToggleGrid,
  playgroundContainerRef
}: EditorPlaygroundProps) => {
  const viewport = useViewportState();
  const viewportDispatch = useViewportDispatch();
  const dispatch = useEditorDispatch();
  const { mode, status, user } = useAuth();
  const remoteEnabled = mode === 'auth' && status === 'authenticated' && Boolean(user);
  const adapter = useMemo(
    () => createAssetStoreAdapter({ userId: user?.id, remoteEnabled }),
    [user?.id, remoteEnabled]
  );
  const localContainerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = playgroundContainerRef || localContainerRef;
  const [pointerMode, setPointerMode] = useState<PointerMode>({ type: 'idle' });
  const [spacePressed, setSpacePressed] = useState(false);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Inertial pan hook
  const { trackVelocity, startInertia, cancelInertia, resetVelocity } = useInertialPan((dx, dy) => {
    viewportDispatch({
      type: 'update',
      viewport: {
        offsetX: viewport.offsetX + dx,
        offsetY: viewport.offsetY + dy
      }
    });
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(true);
      }

      // Zoom shortcuts
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
        if (event.key === '=' || event.key === '+') {
          // Ctrl/Cmd + = (zoom in)
          event.preventDefault();
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const newTransform = zoomAboutPoint(
              viewport,
              viewport.zoom * DEFAULT_ZOOM_CONFIG.zoomStep,
              rect.width / 2,
              rect.height / 2,
              rect.width,
              rect.height
            );
            viewportDispatch({ type: 'update', viewport: newTransform });
          }
        } else if (event.key === '-' || event.key === '_') {
          // Ctrl/Cmd + - (zoom out)
          event.preventDefault();
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const newTransform = zoomAboutPoint(
              viewport,
              viewport.zoom / DEFAULT_ZOOM_CONFIG.zoomStep,
              rect.width / 2,
              rect.height / 2,
              rect.width,
              rect.height
            );
            viewportDispatch({ type: 'update', viewport: newTransform });
          }
        } else if (event.key === '0') {
          // Ctrl/Cmd + 0 (fit to screen)
          event.preventDefault();
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            viewportDispatch({
              type: 'zoom-preset',
              preset: 'fit',
              contentWidth: document.width,
              contentHeight: document.height,
              containerWidth: rect.width,
              containerHeight: rect.height
            });
          }
        } else if (event.key === '1') {
          // Ctrl/Cmd + 1 (100% zoom)
          event.preventDefault();
          viewportDispatch({
            type: 'update',
            viewport: { zoom: 1, offsetX: 0, offsetY: 0 }
          });
        }
      }

      // Arrow keys for layer movement
      if (
        selectedLayerIds.length > 0 &&
        (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        event.preventDefault();
        const delta = event.shiftKey ? 10 : 1;
        const dx = event.key === 'ArrowRight' ? delta : event.key === 'ArrowLeft' ? -delta : 0;
        const dy = event.key === 'ArrowDown' ? delta : event.key === 'ArrowUp' ? -delta : 0;
        const seen = new Set<string>();
        selectedLayerIds.forEach((layerId) => {
          if (seen.has(layerId)) return;
          seen.add(layerId);
          const layer = findLayerById(document.layers, layerId);
          if (!layer || layer.locked) return;
          dispatch({
            type: 'update-transform',
            documentId: document.id,
            layerId: layer.id,
            transform: { ...layer.transform, x: layer.transform.x + dx, y: layer.transform.y + dy }
          });
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
  }, [dispatch, document, selectedLayerIds, viewport, viewportDispatch]);

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
      cancelInertia(); // Cancel any ongoing inertia
      resetVelocity(); // Reset velocity tracking
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
    if (pointerMode.type === 'pan' && containerRef.current) {
      // Track velocity for inertia
      trackVelocity(event.clientX, event.clientY);

      const dx = (event.clientX - pointerMode.startX) / viewport.zoom;
      const dy = (event.clientY - pointerMode.startY) / viewport.zoom;

      const newOffsetX = pointerMode.offsetX + dx;
      const newOffsetY = pointerMode.offsetY + dy;

      // Apply elastic bounds
      const rect = containerRef.current.getBoundingClientRect();
      const constrained = constrainViewportWithElasticity(
        newOffsetX,
        newOffsetY,
        document.width,
        document.height,
        rect.width,
        rect.height,
        viewport.zoom
      );

      viewportDispatch({
        type: 'update',
        viewport: constrained
      });
    }
  };

  const handlePointerUp = () => {
    // Start inertia if we were panning
    if (pointerMode.type === 'pan') {
      startInertia();
    }
    setPointerMode({ type: 'idle' });
  };

  // Use native wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      // Calculate zoom delta
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      const targetZoom = viewport.zoom * delta;

      // Get cursor position relative to container
      const rect = container.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;

      // Apply cursor-anchored zoom
      const newTransform = zoomAboutPoint(viewport, targetZoom, cursorX, cursorY, rect.width, rect.height);

      viewportDispatch({
        type: 'update',
        viewport: newTransform
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [viewport, viewportDispatch]);

  const handleDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!event.dataTransfer.files.length) return;
    const file = event.dataTransfer.files[0];
    try {
      setUploadError(null);
      const url = await adapter.upload(file);
      const layer = createLayer({
        name: file.name,
        type: 'image',
        order: document.layers.filter((entry) => entry.type !== 'base').length,
        baseWidth: document.width / 2,
        baseHeight: document.height / 2,
        assetUrl: url
      });
      dispatch({ type: 'add-layer', documentId: document.id, layer });
    } catch (error) {
      console.error('Failed to upload dropped asset', error);
      setUploadError('Unable to upload the image. Please try again or verify your Supabase configuration.');
    }
  };

  const handleDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  // Auto-fit to screen on document load
  useEffect(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // Container not ready yet

    viewportDispatch({
      type: 'zoom-preset',
      preset: 'fit',
      contentWidth: document.width,
      contentHeight: document.height,
      containerWidth: rect.width,
      containerHeight: rect.height
    });
  }, [document.id, document.width, document.height, viewportDispatch]);

  // Re-fit on window resize
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      viewportDispatch({
        type: 'zoom-preset',
        preset: 'fit',
        contentWidth: document.width,
        contentHeight: document.height,
        containerWidth: rect.width,
        containerHeight: rect.height
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [document.width, document.height, viewportDispatch]);

  const layers = useMemo(() => flattenLayersForRender(document.layers), [document.layers]);
  const visibleLayers = layers.filter((layer) => layer.type !== 'group' && layer.visible);

  return (
    <div className="relative h-full flex-1 overflow-hidden">
      <div className="sr-only" aria-live="polite" ref={liveRegionRef} />
      <div
        ref={containerRef}
        className={`relative h-full w-full overflow-hidden ${
          pointerMode.type === 'pan' ? 'cursor-grabbing' : spacePressed ? 'cursor-grab' : 'cursor-crosshair'
        }`}
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
          onClick={() => onSelectLayers([])}
        >
          <div
            className="relative"
            style={{ width: document.width, height: document.height, backgroundColor: document.baseColor }}
          >
            {visibleLayers.map((layer) => (
              <LayerNode
                key={layer.id}
                layer={layer}
                documentId={document.id}
                selected={selectedLayerIds.includes(layer.id)}
                onSelect={onSelectLayers}
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
      {uploadError && (
        <div
          role="alert"
          className="pointer-events-none absolute bottom-20 left-1/2 w-[min(90%,400px)] -translate-x-1/2 rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-center text-xs text-danger"
        >
          {uploadError}
        </div>
      )}
      {onToggleGrid && (
        <PlaygroundHud document={document} showGrid={showGrid} onToggleGrid={onToggleGrid} containerRef={containerRef} />
      )}
    </div>
  );
};

interface LayerNodeProps {
  layer: Layer;
  documentId: string;
  selected: boolean;
  viewportZoom: number;
  onSelect: (layerIds: string[]) => void;
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
    onSelect([layer.id]);
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
    onSelect([layer.id]);
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
    onSelect([layer.id]);
    setPointerMode({
      type: 'rotate',
      layerId: layer.id,
      startX: event.clientX,
      startY: event.clientY,
      transform: layer.transform
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  if (!layer.visible || layer.type === 'group') {
    return null;
  }

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
