import type { Layer, Transform } from '@shared/index';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { clientToDocument, ViewportGeometry } from '../lib/geometry';
import { getEventClientPoint, HandleType } from '../lib/pointer-math';
import { getSelectionBBox } from '../lib/selection';
import { computeSnap, SnapGuide, SnapResult } from '../lib/snap-utils';
import type { TransformChange } from '../lib/preview-surface';

interface UseTransformHandlesArgs {
  selection: Layer[];
  viewport: ViewportGeometry;
  documentRect: DOMRect | null;
  onPreview: (changes: TransformChange[], guides: SnapGuide[]) => void;
  onCommit: (changes: TransformChange[]) => void;
  onCancel: () => void;
  snapContext: {
    gridSize: number;
    threshold: number;
    documentWidth: number;
    documentHeight: number;
    otherLayers: Layer[];
  };
}

interface ActiveTransformState {
  handle: HandleType;
  pointerId: number;
  startPoint: { x: number; y: number };
  initialTransforms: Record<string, Transform>;
  selectionCenter: { x: number; y: number } | null;
  aspectLocked: boolean;
  rotateStartAngle?: number;
}

const cursorForHandle = (handle: HandleType): string => {
  switch (handle) {
    case 'move':
    case 'rotate':
      return 'grabbing';
    case 'top':
    case 'bottom':
      return 'ns-resize';
    case 'left':
    case 'right':
      return 'ew-resize';
    case 'top-left':
    case 'bottom-right':
      return 'nwse-resize';
    case 'top-right':
    case 'bottom-left':
      return 'nesw-resize';
    default:
      return 'default';
  }
};

const applyMove = (
  initial: Record<string, Transform>,
  delta: { x: number; y: number }
): Record<string, Transform> => {
  const result: Record<string, Transform> = {};
  Object.entries(initial).forEach(([layerId, transform]) => {
    result[layerId] = {
      ...transform,
      x: transform.x + delta.x,
      y: transform.y + delta.y
    };
  });
  return result;
};

const clampDimension = (value: number, min: number) => Math.max(min, value);

const applyStretch = (
  initial: Record<string, Transform>,
  handle: HandleType,
  worldDelta: { x: number; y: number },
  aspectLocked: boolean
): Record<string, Transform> => {
  const result: Record<string, Transform> = {};
  Object.entries(initial).forEach(([layerId, transform]) => {
    const angle = (transform.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const localDx = worldDelta.x * cos + worldDelta.y * sin;
    const localDy = -worldDelta.x * sin + worldDelta.y * cos;

    const minWidth = 8;
    const minHeight = 8;

    const startWidth = transform.width;
    const startHeight = transform.height;
    let deltaWidthLocal = 0;
    let deltaHeightLocal = 0;

    if (handle.includes('right')) {
      deltaWidthLocal = localDx;
    } else if (handle.includes('left')) {
      deltaWidthLocal = -localDx;
    }

    if (handle.includes('bottom')) {
      deltaHeightLocal = localDy;
    } else if (handle.includes('top')) {
      deltaHeightLocal = -localDy;
    }

    if (aspectLocked && handle.includes('-')) {
      const widthScale = startWidth === 0 ? 0 : deltaWidthLocal / startWidth;
      const heightScale = startHeight === 0 ? 0 : deltaHeightLocal / startHeight;
      let dominant = Math.abs(widthScale) > Math.abs(heightScale) ? widthScale : heightScale;
      if (!Number.isFinite(dominant)) dominant = 0;
      deltaWidthLocal = dominant * startWidth;
      deltaHeightLocal = dominant * startHeight;
    }

    const nextWidth = clampDimension(startWidth + deltaWidthLocal, minWidth);
    const nextHeight = clampDimension(startHeight + deltaHeightLocal, minHeight);

    const widthChange = nextWidth - startWidth;
    const heightChange = nextHeight - startHeight;

    let shiftLocalX = 0;
    let shiftLocalY = 0;

    if (handle.includes('right')) {
      shiftLocalX += widthChange / 2;
    } else if (handle.includes('left')) {
      shiftLocalX -= widthChange / 2;
    }

    if (handle.includes('bottom')) {
      shiftLocalY += heightChange / 2;
    } else if (handle.includes('top')) {
      shiftLocalY -= heightChange / 2;
    }

    const shiftWorldX = shiftLocalX * cos - shiftLocalY * sin;
    const shiftWorldY = shiftLocalX * sin + shiftLocalY * cos;

    const centerX = transform.x + transform.width / 2 + shiftWorldX;
    const centerY = transform.y + transform.height / 2 + shiftWorldY;

    result[layerId] = {
      ...transform,
      width: nextWidth,
      height: nextHeight,
      x: centerX - nextWidth / 2,
      y: centerY - nextHeight / 2
    };
  });
  return result;
};

const applyRotate = (
  initial: Record<string, Transform>,
  deltaAngle: number
): Record<string, Transform> => {
  const result: Record<string, Transform> = {};
  Object.entries(initial).forEach(([layerId, transform]) => {
    result[layerId] = {
      ...transform,
      rotation: transform.rotation + deltaAngle
    };
  });
  return result;
};

const toChanges = (transforms: Record<string, Transform>): TransformChange[] =>
  Object.entries(transforms).map(([id, transform]) => ({ id, ...transform }));

export const useTransformHandles = ({
  selection,
  viewport,
  documentRect,
  onPreview,
  onCommit,
  onCancel,
  snapContext
}: UseTransformHandlesArgs) => {
  const stateRef = useRef<ActiveTransformState | null>(null);
  const rafRef = useRef<number | null>(null);
  const captureTargetRef = useRef<EventTarget | null>(null);
  const previousBodyCursorRef = useRef<string | null>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);

  const setBodyCursor = useCallback((cursor: string | null) => {
    if (typeof document === 'undefined') return;
    if (cursor) {
      if (previousBodyCursorRef.current === null) {
        previousBodyCursorRef.current = document.body.style.cursor || '';
      }
      document.body.style.cursor = cursor;
    } else {
      if (previousBodyCursorRef.current !== null) {
        document.body.style.cursor = previousBodyCursorRef.current;
        previousBodyCursorRef.current = null;
      } else {
        document.body.style.removeProperty('cursor');
      }
    }
  }, []);

  const reset = useCallback(() => {
    if (stateRef.current && captureTargetRef.current instanceof Element) {
      try {
        captureTargetRef.current.releasePointerCapture(stateRef.current.pointerId);
      } catch (error) {
        // Ignore if capture was already released
      }
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stateRef.current = null;
    captureTargetRef.current = null;
    setActiveHandle(null);
    setGuides([]);
    setBodyCursor(null);
    onCancel();
  }, [onCancel, setBodyCursor]);

  useEffect(() => () => reset(), [reset]);

  useEffect(
    () => () => {
      setBodyCursor(null);
    },
    [setBodyCursor]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && stateRef.current) {
        event.preventDefault();
        reset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reset]);

  const commit = useCallback(
    (changes: TransformChange[]) => {
      onCommit(changes);
      setGuides([]);
    },
    [onCommit]
  );

  const schedulePreview = useCallback(
    (event: PointerEvent) => {
      if (!stateRef.current || !documentRect) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const state = stateRef.current;
        if (!state) return;
        const clientPoint = getEventClientPoint(event);
        const pointer = clientToDocument(clientPoint, viewport, { documentRect });
        const delta = {
          x: pointer.x - state.startPoint.x,
          y: pointer.y - state.startPoint.y
        };
        let nextTransforms: Record<string, Transform> = state.initialTransforms;
        let snap: SnapResult | null = null;

        if (state.handle === 'move') {
          snap = computeSnap(
            Object.values(state.initialTransforms),
            delta,
            {
              gridSize: snapContext.gridSize,
              threshold: snapContext.threshold,
              viewportZoom: viewport.zoom,
              otherLayers: snapContext.otherLayers.map((layer) => layer.transform),
              documentWidth: snapContext.documentWidth,
              documentHeight: snapContext.documentHeight
            }
          );
          nextTransforms = applyMove(state.initialTransforms, snap.delta);
        } else if (state.handle === 'rotate' && state.selectionCenter) {
          const angle = Math.atan2(pointer.y - state.selectionCenter.y, pointer.x - state.selectionCenter.x);
          let deltaAngle = ((angle - (state.rotateStartAngle ?? angle)) * 180) / Math.PI;
          if (!event.altKey) {
            const snapIncrement = 15;
            deltaAngle = Math.round(deltaAngle / snapIncrement) * snapIncrement;
          }
          nextTransforms = applyRotate(state.initialTransforms, deltaAngle);
        } else if (
          state.handle === 'top' ||
          state.handle === 'bottom' ||
          state.handle === 'left' ||
          state.handle === 'right' ||
          state.handle.includes('top') ||
          state.handle.includes('bottom')
        ) {
          nextTransforms = applyStretch(state.initialTransforms, state.handle, delta, state.aspectLocked);
        }
        onPreview(toChanges(nextTransforms), snap?.guides ?? []);
        setGuides(snap?.guides ?? []);
      });
    },
    [documentRect, onPreview, snapContext, viewport]
  );

  const endPointerTracking = useCallback(
    (event: PointerEvent, commitChanges: boolean) => {
      if (!stateRef.current) return;
      const state = stateRef.current;
      if (commitChanges && documentRect) {
        const clientPoint = getEventClientPoint(event);
        const pointer = clientToDocument(clientPoint, viewport, { documentRect });
        const delta = {
          x: pointer.x - state.startPoint.x,
          y: pointer.y - state.startPoint.y
        };
        let nextTransforms: Record<string, Transform> = state.initialTransforms;
        if (state.handle === 'move') {
          const snap = computeSnap(
            Object.values(state.initialTransforms),
            delta,
            {
              gridSize: snapContext.gridSize,
              threshold: snapContext.threshold,
              viewportZoom: viewport.zoom,
              otherLayers: snapContext.otherLayers.map((layer) => layer.transform),
              documentWidth: snapContext.documentWidth,
              documentHeight: snapContext.documentHeight
            }
          );
          nextTransforms = applyMove(state.initialTransforms, snap.delta);
        } else if (
          state.handle === 'top' ||
          state.handle === 'bottom' ||
          state.handle === 'left' ||
          state.handle === 'right' ||
          state.handle.includes('top') ||
          state.handle.includes('bottom')
        ) {
          nextTransforms = applyStretch(state.initialTransforms, state.handle, delta, state.aspectLocked);
        } else if (state.handle === 'rotate' && state.selectionCenter) {
          const angle = Math.atan2(pointer.y - state.selectionCenter.y, pointer.x - state.selectionCenter.x);
          let deltaAngle = ((angle - (state.rotateStartAngle ?? angle)) * 180) / Math.PI;
          if (!event.altKey) {
            const snapIncrement = 15;
            deltaAngle = Math.round(deltaAngle / snapIncrement) * snapIncrement;
          }
          nextTransforms = applyRotate(state.initialTransforms, deltaAngle);
        }
        commit(toChanges(nextTransforms));
      } else {
        reset();
      }
      stateRef.current = null;
      captureTargetRef.current = null;
      setActiveHandle(null);
      setBodyCursor(null);
      setGuides([]);
    },
    [commit, documentRect, reset, setBodyCursor, snapContext, viewport]
  );

  const beginPointerTracking = useCallback(
    (handle: HandleType, event: ReactPointerEvent) => {
      if (!documentRect || selection.length === 0) return;
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const pointerId = event.pointerId;
      const clientPoint = getEventClientPoint(event.nativeEvent);
      const pointer = clientToDocument(clientPoint, viewport, { documentRect });
      const initialTransforms: Record<string, Transform> = selection.reduce((acc, layer) => {
        acc[layer.id] = layer.transform;
        return acc;
      }, {} as Record<string, Transform>);
      const selectionBox = getSelectionBBox(selection);
      const selectionCenter = selectionBox
        ? { x: selectionBox.x + selectionBox.width / 2, y: selectionBox.y + selectionBox.height / 2 }
        : null;
      stateRef.current = {
        handle,
        pointerId,
        startPoint: pointer,
        initialTransforms,
        aspectLocked: handle.includes('-')
          ? !event.shiftKey // Corners maintain aspect unless Shift is held
          : false,
        selectionCenter,
        rotateStartAngle:
          handle === 'rotate' && selectionCenter
            ? Math.atan2(pointer.y - selectionCenter.y, pointer.x - selectionCenter.x)
            : undefined
      };
      captureTargetRef.current = event.currentTarget;
      event.currentTarget.setPointerCapture(pointerId);
      setActiveHandle(handle);
      setBodyCursor(cursorForHandle(handle));

      const handleMove = (nativeEvent: PointerEvent) => {
        if (nativeEvent.pointerId !== pointerId) return;
        schedulePreview(nativeEvent);
      };
      const handleUp = (nativeEvent: PointerEvent) => {
        if (nativeEvent.pointerId !== pointerId) return;
        if (captureTargetRef.current instanceof Element) {
          try {
            captureTargetRef.current.releasePointerCapture(pointerId);
          } catch (error) {
            // Ignore if capture was already released
          }
        }
        captureTargetRef.current = null;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleCancel);
        endPointerTracking(nativeEvent, true);
      };
      const handleCancel = (nativeEvent: PointerEvent) => {
        if (nativeEvent.pointerId !== pointerId) return;
        if (captureTargetRef.current instanceof Element) {
          try {
            captureTargetRef.current.releasePointerCapture(pointerId);
          } catch (error) {
            // Ignore if capture was already released
          }
        }
        captureTargetRef.current = null;
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleCancel);
        endPointerTracking(nativeEvent, false);
      };

      window.addEventListener('pointermove', handleMove, { passive: true });
      window.addEventListener('pointerup', handleUp, { passive: true });
      window.addEventListener('pointercancel', handleCancel, { passive: true });
    },
    [documentRect, endPointerTracking, schedulePreview, selection, setBodyCursor, viewport]
  );

  return {
    beginPointerTracking,
    guides,
    isTransforming: stateRef.current !== null,
    activeHandle
  };
};

export type UseTransformHandlesReturn = ReturnType<typeof useTransformHandles>;
