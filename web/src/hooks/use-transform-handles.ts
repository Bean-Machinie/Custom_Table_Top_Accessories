import type { Layer, Transform } from '@shared/index';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { clientToDocumentPoint, getEventClientPoint, HandleType } from '../lib/pointer-math';
import { computeSnap, SnapGuide, SnapResult } from '../lib/snap-utils';
import { expandBoundingBoxes, getRotatedBoundingBox } from '../lib/transform-geometry';

interface UseTransformHandlesArgs {
  selection: Layer[];
  viewport: { zoom: number };
  documentRect: DOMRect | null;
  onPreview: (transforms: Record<string, Transform>, guides: SnapGuide[]) => void;
  onCommit: (transforms: Record<string, Transform>) => void;
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
  boundingBox: ReturnType<typeof getRotatedBoundingBox> | null;
  aspectLocked: boolean;
  initialAngle?: number;
  altKey?: boolean;
}

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

const applyScale = (
  initial: Record<string, Transform>,
  handle: HandleType,
  delta: { x: number; y: number },
  boundingBox: ReturnType<typeof getRotatedBoundingBox> | null,
  aspectLocked: boolean
): Record<string, Transform> => {
  if (!boundingBox) return initial;
  const result: Record<string, Transform> = {};
  const width = Math.max(1, boundingBox.width);
  const height = Math.max(1, boundingBox.height);
  const scaleXDelta = handle.includes('left') ? -delta.x : handle.includes('right') ? delta.x : 0;
  const scaleYDelta = handle.includes('top') ? -delta.y : handle.includes('bottom') ? delta.y : 0;
  const nextWidth = Math.max(8, width + scaleXDelta);
  const nextHeight = Math.max(8, height + scaleYDelta);
  const ratioX = nextWidth / width;
  const ratioY = nextHeight / height;
  const ratio = aspectLocked ? Math.max(ratioX, ratioY) : undefined;
  const finalRatioX = aspectLocked ? ratio! : ratioX;
  const finalRatioY = aspectLocked ? ratio! : ratioY;
  const anchorX = handle.includes('left') ? boundingBox.maxX : handle.includes('right') ? boundingBox.minX : boundingBox.center.x;
  const anchorY = handle.includes('top') ? boundingBox.maxY : handle.includes('bottom') ? boundingBox.minY : boundingBox.center.y;

  Object.entries(initial).forEach(([layerId, transform]) => {
    const centerX = transform.x + transform.width / 2;
    const centerY = transform.y + transform.height / 2;
    const distanceX = centerX - anchorX;
    const distanceY = centerY - anchorY;
    const scaledCenterX = anchorX + distanceX * finalRatioX;
    const scaledCenterY = anchorY + distanceY * finalRatioY;
    const widthScaled = Math.max(8, transform.width * finalRatioX);
    const heightScaled = Math.max(8, transform.height * finalRatioY);
    result[layerId] = {
      ...transform,
      width: widthScaled,
      height: heightScaled,
      x: scaledCenterX - widthScaled / 2,
      y: scaledCenterY - heightScaled / 2
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
  const [guides, setGuides] = useState<SnapGuide[]>([]);

  const reset = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stateRef.current = null;
    setGuides([]);
    onCancel();
  }, [onCancel]);

  useEffect(() => () => reset(), [reset]);

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
    (transforms: Record<string, Transform>) => {
      onCommit(transforms);
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
        const pointer = clientToDocumentPoint(clientPoint, { documentRect, viewport });
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
        } else if (
          state.handle === 'top' ||
          state.handle === 'bottom' ||
          state.handle === 'left' ||
          state.handle === 'right' ||
          state.handle.includes('top') ||
          state.handle.includes('bottom')
        ) {
          nextTransforms = applyScale(state.initialTransforms, state.handle, delta, state.boundingBox, state.aspectLocked);
        } else if (state.handle === 'rotate' && state.boundingBox) {
          const center = state.boundingBox.center;
          const angle = Math.atan2(pointer.y - center.y, pointer.x - center.x);
          const deltaAngle = ((angle - (state.initialAngle ?? angle)) * 180) / Math.PI;
          const snapIncrement = 15;
          const snapped = event.altKey
            ? Math.round(deltaAngle / snapIncrement) * snapIncrement
            : deltaAngle;
          nextTransforms = applyRotate(state.initialTransforms, snapped);
        }
        onPreview(nextTransforms, snap?.guides ?? []);
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
        const pointer = clientToDocumentPoint(clientPoint, { documentRect, viewport });
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
          nextTransforms = applyScale(state.initialTransforms, state.handle, delta, state.boundingBox, state.aspectLocked);
        } else if (state.handle === 'rotate' && state.boundingBox) {
          const center = state.boundingBox.center;
          const angle = Math.atan2(pointer.y - center.y, pointer.x - center.x);
          const deltaAngle = ((angle - (state.initialAngle ?? angle)) * 180) / Math.PI;
          const snapIncrement = 15;
          const snapped = event.altKey
            ? Math.round(deltaAngle / snapIncrement) * snapIncrement
            : deltaAngle;
          nextTransforms = applyRotate(state.initialTransforms, snapped);
        }
        commit(nextTransforms);
      } else {
        reset();
      }
      stateRef.current = null;
      setGuides([]);
    },
    [commit, documentRect, reset, snapContext, viewport]
  );

  const beginPointerTracking = useCallback(
    (handle: HandleType, event: ReactPointerEvent) => {
      if (!documentRect || selection.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      const pointerId = event.pointerId;
      const clientPoint = getEventClientPoint(event.nativeEvent);
      const pointer = clientToDocumentPoint(clientPoint, { documentRect, viewport });
      const initialTransforms: Record<string, Transform> = selection.reduce((acc, layer) => {
        acc[layer.id] = layer.transform;
        return acc;
      }, {} as Record<string, Transform>);
      const selectionBoxes = selection.map((layer) => getRotatedBoundingBox(layer.transform));
      const boundingBox = expandBoundingBoxes(selectionBoxes);
      stateRef.current = {
        handle,
        pointerId,
        startPoint: pointer,
        initialTransforms,
        boundingBox,
        aspectLocked: handle.includes('-')
          ? !event.shiftKey // Corners maintain aspect unless Shift is held
          : false,
        initialAngle:
          handle === 'rotate' && boundingBox
            ? Math.atan2(pointer.y - boundingBox.center.y, pointer.x - boundingBox.center.x)
            : undefined
      };
      event.currentTarget.setPointerCapture(pointerId);

      const handleMove = (nativeEvent: PointerEvent) => {
        if (nativeEvent.pointerId !== pointerId) return;
        schedulePreview(nativeEvent);
      };
      const handleUp = (nativeEvent: PointerEvent) => {
        if (nativeEvent.pointerId !== pointerId) return;
        event.currentTarget.releasePointerCapture(pointerId);
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleCancel);
        endPointerTracking(nativeEvent, true);
      };
      const handleCancel = (nativeEvent: PointerEvent) => {
        if (nativeEvent.pointerId !== pointerId) return;
        event.currentTarget.releasePointerCapture(pointerId);
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleCancel);
        endPointerTracking(nativeEvent, false);
      };

      window.addEventListener('pointermove', handleMove, { passive: true });
      window.addEventListener('pointerup', handleUp, { passive: true });
      window.addEventListener('pointercancel', handleCancel, { passive: true });
    },
    [documentRect, endPointerTracking, schedulePreview, selection, viewport]
  );

  return {
    beginPointerTracking,
    guides,
    isTransforming: stateRef.current !== null
  };
};

export type UseTransformHandlesReturn = ReturnType<typeof useTransformHandles>;
