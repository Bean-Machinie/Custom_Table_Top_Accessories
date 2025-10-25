import type { Layer, Transform } from '@shared/index';
import clsx from 'classnames';
import { memo, useMemo, type CSSProperties } from 'react';

import { useTransformHandles } from '../../hooks/use-transform-handles';
import { scaleHandleSizeForZoom } from '../../lib/pointer-math';
import { SnapGuide } from '../../lib/snap-utils';
import { expandBoundingBoxes, getRotatedBoundingBox } from '../../lib/transform-geometry';

interface SelectionOverlayProps {
  selection: Layer[];
  previewTransforms: Record<string, Transform>;
  viewportZoom: number;
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

const HANDLE_TYPES = [
  'top-left',
  'top',
  'top-right',
  'right',
  'bottom-right',
  'bottom',
  'bottom-left',
  'left'
] as const;

type Handle = (typeof HANDLE_TYPES)[number];

export const SelectionOverlay = memo(
  ({
    selection,
    previewTransforms,
    viewportZoom,
    documentRect,
    onPreview,
    onCommit,
    onCancel,
    snapContext
  }: SelectionOverlayProps) => {
    const selectionWithPreview = useMemo(() => {
      return selection.map((layer) => ({
        ...layer,
        transform: previewTransforms[layer.id] ?? layer.transform
      }));
    }, [previewTransforms, selection]);

    const boundingBox = useMemo(() => {
      if (selectionWithPreview.length === 0) return null;
      const boxes = selectionWithPreview.map((layer) => getRotatedBoundingBox(layer.transform));
      return expandBoundingBoxes(boxes);
    }, [selectionWithPreview]);

    const handleSize = scaleHandleSizeForZoom(12, viewportZoom);
    const rotationHandleOffset = handleSize * 4;

    const { beginPointerTracking, guides } = useTransformHandles({
      selection: selectionWithPreview,
      viewport: { zoom: viewportZoom },
      documentRect,
      onPreview,
      onCommit,
      onCancel,
      snapContext
    });

    if (!boundingBox) return null;

    return (
      <div className="pointer-events-none absolute inset-0">
        <div
          className="pointer-events-auto absolute border border-accent/80"
          style={{
            left: boundingBox.minX,
            top: boundingBox.minY,
            width: boundingBox.width,
            height: boundingBox.height
          }}
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-move bg-transparent"
            aria-label="Move selection"
            onPointerDown={(event) => beginPointerTracking('move', event)}
          />
          {HANDLE_TYPES.map((handle) => {
            const style: CSSProperties = {};
            if (handle.includes('top')) style.top = -handleSize / 2;
            if (handle.includes('bottom')) style.bottom = -handleSize / 2;
            if (handle.includes('left')) style.left = -handleSize / 2;
            if (handle.includes('right')) style.right = -handleSize / 2;
            if (handle === 'top') {
              style.left = `calc(50% - ${handleSize / 2}px)`;
            } else if (handle === 'bottom') {
              style.left = `calc(50% - ${handleSize / 2}px)`;
            } else if (handle === 'left') {
              style.top = `calc(50% - ${handleSize / 2}px)`;
            } else if (handle === 'right') {
              style.top = `calc(50% - ${handleSize / 2}px)`;
            }
            const cursor =
              handle === 'top' || handle === 'bottom'
                ? 'ns-resize'
                : handle === 'left' || handle === 'right'
                ? 'ew-resize'
                : handle === 'top-left' || handle === 'bottom-right'
                ? 'nwse-resize'
                : 'nesw-resize';
            return (
              <button
                type="button"
                key={handle}
                aria-label={`${handle} resize handle`}
                className={clsx(
                  'absolute rounded-full border border-accent bg-background shadow-sm',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
                )}
                style={{ width: handleSize, height: handleSize, cursor, ...style }}
                onPointerDown={(event) => beginPointerTracking(handle, event)}
              />
            );
          })}
          <button
            type="button"
            aria-label="Rotate selection"
            className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full border border-accent bg-background"
            style={{
              width: handleSize,
              height: handleSize,
              top: -rotationHandleOffset,
              cursor: 'grab'
            }}
            onPointerDown={(event) => beginPointerTracking('rotate', event)}
          />
        </div>
        {guides.map((guide) => (
          <div
            key={guide.id}
            className="pointer-events-none absolute bg-accent/60"
            style={
              guide.orientation === 'vertical'
                ? { left: guide.position, top: 0, bottom: 0, width: 1 }
                : { top: guide.position, left: 0, right: 0, height: 1 }
            }
          />
        ))}
      </div>
    );
  }
);

SelectionOverlay.displayName = 'SelectionOverlay';
