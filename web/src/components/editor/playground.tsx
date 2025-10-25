import type { FrameDocument, Layer, Transform } from '@shared/index';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
  type WheelEvent as ReactWheelEvent
} from 'react';

import { createAssetStoreAdapter } from '../../adapters/asset-adapter';
import { flattenLayersForRender, findLayerById } from '../../lib/layer-tree';
import { transformToCss } from '../../lib/transform';
import { zoomAboutPoint, DEFAULT_ZOOM_CONFIG } from '../../lib/zoom-utils';
import { constrainViewportWithElasticity } from '../../lib/bounds-utils';
import { createLayer, useEditorDispatch } from '../../stores/editor-store';
import { useAuth } from '../../stores/auth-store';
import { useViewportDispatch, useViewportState } from '../../stores/viewport-store';
import { useInertialPan } from '../../hooks/use-inertial-pan';
import { PlaygroundHud } from './playground-hud';
import { GridRenderer } from './grid-renderer';
import { SelectionOverlay } from './selection-overlay';
import { hitTestLayers } from '../../lib/hit-test';
import { clientToDocumentPoint, getEventClientPoint } from '../../lib/pointer-math';
import type { SnapGuide } from '../../lib/snap-utils';

export interface EditorPlaygroundRef {
  containerRef: React.RefObject<HTMLDivElement>;
}

interface EditorPlaygroundProps {
  document: FrameDocument;
  selectedLayerIds: string[];
  onSelectLayers: Dispatch<SetStateAction<string[]>>;
  showGrid: boolean;
  onToggleGrid?: () => void;
  playgroundContainerRef?: React.RefObject<HTMLDivElement>;
}

type PointerMode = { type: 'idle' } | { type: 'pan'; lastX: number; lastY: number };

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
  const documentRef = useRef<HTMLDivElement | null>(null);
  const [documentRect, setDocumentRect] = useState<DOMRect | null>(null);
  const [previewTransforms, setPreviewTransforms] = useState<Record<string, Transform>>({});
  const selectionAnchorRef = useRef<string | null>(null);

  // Inertial pan hook
  const { trackVelocity, startInertia, cancelInertia, resetVelocity } = useInertialPan((dx, dy) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const constrained = constrainViewportWithElasticity(
      viewport.offsetX + dx,
      viewport.offsetY + dy,
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
  });

  useLayoutEffect(() => {
    if (documentRef.current) {
      setDocumentRect(documentRef.current.getBoundingClientRect());
    }
  }, [document.height, document.width, viewport.offsetX, viewport.offsetY, viewport.zoom]);

  useEffect(() => {
    const updateRect = () => {
      if (documentRef.current) {
        setDocumentRect(documentRef.current.getBoundingClientRect());
      }
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, []);

  useEffect(() => {
    if (selectedLayerIds.length > 0) {
      selectionAnchorRef.current = selectedLayerIds[selectedLayerIds.length - 1];
    } else {
      selectionAnchorRef.current = null;
    }
  }, [selectedLayerIds]);

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
              rect.height,
              {
                contentWidth: document.width,
                contentHeight: document.height
              }
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
              rect.height,
              {
                contentWidth: document.width,
                contentHeight: document.height
              }
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
        const updates: { layerId: string; transform: Transform }[] = [];
        selectedLayerIds.forEach((layerId) => {
          if (seen.has(layerId)) return;
          seen.add(layerId);
          const layer = findLayerById(document.layers, layerId);
          if (!layer || layer.locked) return;
          updates.push({
            layerId: layer.id,
            transform: { ...layer.transform, x: layer.transform.x + dx, y: layer.transform.y + dy }
          });
        });
        if (updates.length > 0) {
          dispatch({ type: 'update-layer-transforms', documentId: document.id, updates });
        }
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
        lastX: event.clientX,
        lastY: event.clientY
      });
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
      return;
    }
  };

  const handleTransformPreview = useCallback(
    (transforms: Record<string, Transform>, _guides?: SnapGuide[]) => {
      setPreviewTransforms(transforms);
    },
    []
  );

  const handleTransformCommit = useCallback(
    (transforms: Record<string, Transform>) => {
      const updates = Object.entries(transforms).map(([layerId, transform]) => ({ layerId, transform }));
      if (updates.length > 0) {
        dispatch({ type: 'update-layer-transforms', documentId: document.id, updates });
      }
      setPreviewTransforms({});
    },
    [dispatch, document.id]
  );

  const handleTransformCancel = useCallback(() => {
    setPreviewTransforms({});
  }, []);

  const handleCanvasPointerDown = (
    event: ReactPointerEvent<HTMLDivElement> | ReactMouseEvent<HTMLDivElement>
  ) => {
    if (spacePressed || event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!documentRect) {
      if (documentRef.current) {
        setDocumentRect(documentRef.current.getBoundingClientRect());
      }
    }
    const rect = documentRect ?? documentRef.current?.getBoundingClientRect();
    if (!rect) return;
    const docPoint = clientToDocumentPoint(getEventClientPoint(event.nativeEvent), {
      documentRect: rect,
      viewport
    });
    const renderLayers = visibleLayers
      .map((layer) => ({
        ...layer,
        transform: previewTransforms[layer.id] ?? layer.transform
      }))
      .sort((a, b) => a.order - b.order);
    const hit = hitTestLayers(renderLayers, docPoint);
    if (hit) {
      if (event.metaKey || event.ctrlKey) {
        onSelectLayers((current) =>
          current.includes(hit.id) ? current.filter((id) => id !== hit.id) : [...current, hit.id]
        );
        return;
      }
      if (event.shiftKey && selectionAnchorRef.current) {
        const order = renderLayers.map((layer) => layer.id);
        const anchorIndex = order.indexOf(selectionAnchorRef.current);
        const targetIndex = order.indexOf(hit.id);
        if (anchorIndex !== -1 && targetIndex !== -1) {
          const [from, to] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
          const range = order.slice(from, to + 1);
          onSelectLayers(() => range);
          return;
        }
      }
      onSelectLayers(() => [hit.id]);
      return;
    }
    onSelectLayers(() => []);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerMode.type === 'pan' && containerRef.current) {
      // Track velocity for inertia
      trackVelocity(event.clientX, event.clientY);

      // Calculate delta from LAST position (not start position)
      // This ensures 1:1 continuous tracking with the mouse
      const dx = event.clientX - pointerMode.lastX;
      const dy = event.clientY - pointerMode.lastY;

      const newOffsetX = viewport.offsetX + dx;
      const newOffsetY = viewport.offsetY + dy;

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

      // Update lastX/lastY for next move
      setPointerMode({
        type: 'pan',
        lastX: event.clientX,
        lastY: event.clientY
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
      const newTransform = zoomAboutPoint(
        viewport,
        targetZoom,
        cursorX,
        cursorY,
        rect.width,
        rect.height,
        {
          contentWidth: document.width,
          contentHeight: document.height
        }
      );

      viewportDispatch({
        type: 'update',
        viewport: newTransform
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [viewport, viewportDispatch, document.width, document.height]);

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
  const visibleLayers = useMemo(
    () => layers.filter((layer) => layer.type !== 'group' && layer.visible),
    [layers]
  );
  const interactiveLayers = useMemo(
    () =>
      visibleLayers.map((layer) => ({
        ...layer,
        transform: previewTransforms[layer.id] ?? layer.transform
      })),
    [previewTransforms, visibleLayers]
  );
  const selectedLayers = useMemo(
    () => interactiveLayers.filter((layer) => selectedLayerIds.includes(layer.id)),
    [interactiveLayers, selectedLayerIds]
  );
  const snapContext = useMemo(
    () => ({
      gridSize: 32,
      threshold: 8,
      documentWidth: document.width,
      documentHeight: document.height,
      otherLayers: interactiveLayers.filter((layer) => !selectedLayerIds.includes(layer.id))
    }),
    [document.height, document.width, interactiveLayers, selectedLayerIds]
  );

  return (
    <div className="relative h-full flex-1 overflow-hidden">
      <div className="sr-only" aria-live="polite" ref={liveRegionRef} />
      <div
        ref={containerRef}
        className={`relative h-full w-full overflow-hidden bg-background ${
          pointerMode.type === 'pan' ? 'cursor-grabbing' : spacePressed ? 'cursor-grab' : 'cursor-default'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Grid background - behind everything */}
        {showGrid && (
          <div
            className="absolute left-1/2 top-1/2 origin-top-left pointer-events-none"
            style={{
              transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})`,
              width: document.width,
              height: document.height
            }}
          >
            <GridRenderer zoom={viewport.zoom} canvasWidth={document.width} canvasHeight={document.height} />
          </div>
        )}

        {/* Canvas and layers */}
        <div
          className="absolute left-1/2 top-1/2 origin-top-left will-change-transform"
          style={{
            transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})`
          }}
        >
          <div
            ref={documentRef}
            data-testid="editor-document"
            className="relative shadow-lg"
            style={{ width: document.width, height: document.height, backgroundColor: document.baseColor }}
            onPointerDown={handleCanvasPointerDown}
            onMouseDown={handleCanvasPointerDown}
          >
            {interactiveLayers.map((layer) => (
              <LayerNode key={layer.id} layer={layer} selected={selectedLayerIds.includes(layer.id)} />
            ))}
            {selectedLayers.length > 0 && (
              <SelectionOverlay
                selection={selectedLayers}
                previewTransforms={previewTransforms}
                viewportZoom={viewport.zoom}
                documentRect={documentRect}
                onPreview={handleTransformPreview}
                onCommit={handleTransformCommit}
                onCancel={handleTransformCancel}
                snapContext={snapContext}
              />
            )}
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
  selected: boolean;
}

const LayerNode = ({ layer, selected }: LayerNodeProps) => {
  if (!layer.visible || layer.type === 'group') {
    return null;
  }

  const style = transformToCss(layer.transform);

  return (
    <div className={`absolute ${selected ? 'z-10' : ''}`} style={style}>
      {layer.type === 'image' && layer.assetUrl ? (
        <img
          src={layer.assetUrl}
          alt={layer.name}
          className="h-full w-full rounded-md object-fill"
          draggable={false}
        />
      ) : (
        <div className={`h-full w-full rounded-md border ${selected ? 'border-accent/80' : 'border-border/40'}`} />
      )}
    </div>
  );
};
