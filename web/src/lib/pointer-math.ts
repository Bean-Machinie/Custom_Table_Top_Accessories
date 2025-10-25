import type { EditorViewportState } from '@shared/index';
import type { PointerEvent as ReactPointerEvent } from 'react';

export interface ClientPoint {
  x: number;
  y: number;
}

export const getEventClientPoint = (event: PointerEvent | ReactPointerEvent | MouseEvent): ClientPoint => ({
  x: 'clientX' in event ? event.clientX : 0,
  y: 'clientY' in event ? event.clientY : 0
});

export interface DocumentSpaceArgs {
  documentRect: DOMRect;
  viewport: Pick<EditorViewportState, 'zoom'>;
}

export const clientToDocumentPoint = (
  point: ClientPoint,
  args: DocumentSpaceArgs
): { x: number; y: number } => {
  const { documentRect, viewport } = args;
  const zoom = viewport.zoom || 1;
  return {
    x: (point.x - documentRect.left) / zoom,
    y: (point.y - documentRect.top) / zoom
  };
};

export const documentToClientPoint = (
  point: { x: number; y: number },
  args: DocumentSpaceArgs
): ClientPoint => {
  const { documentRect, viewport } = args;
  const zoom = viewport.zoom || 1;
  return {
    x: documentRect.left + point.x * zoom,
    y: documentRect.top + point.y * zoom
  };
};

export const scaleHandleSizeForZoom = (size: number, zoom: number, pixelRatio = window.devicePixelRatio || 1) => {
  const effectiveZoom = zoom * pixelRatio;
  const clamped = Math.max(0.5, Math.min(effectiveZoom, 6));
  return size / clamped;
};

export type HandleType =
  | 'move'
  | 'rotate'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top-right'
  | 'bottom-right'
  | 'bottom-left';

export const getHandleUnderPointer = (
  client: ClientPoint,
  handles: Array<{ bounds: DOMRect; type: HandleType }>
): HandleType | null => {
  for (let index = handles.length - 1; index >= 0; index -= 1) {
    const handle = handles[index];
    if (
      client.x >= handle.bounds.left &&
      client.x <= handle.bounds.right &&
      client.y >= handle.bounds.top &&
      client.y <= handle.bounds.bottom
    ) {
      return handle.type;
    }
  }
  return null;
};
