/**
 * Live minimap component with click-to-jump and drag-to-navigate
 * Shows a bird's-eye view of the canvas with a viewport rectangle
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FrameDocument } from '@shared/index';

import { useViewportDispatch, useViewportState } from '../../stores/viewport-store';

interface MinimapProps {
  document: FrameDocument;
  containerRef: React.RefObject<HTMLDivElement>;
}

const MINIMAP_HEIGHT = 160; // Fixed height in pixels
const MINIMAP_PADDING = 8; // Padding around the minimap content

export const Minimap = ({ document, containerRef }: MinimapProps) => {
  const viewport = useViewportState();
  const viewportDispatch = useViewportDispatch();
  const minimapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [minimapScale, setMinimapScale] = useState(1);

  // Calculate minimap scale to fit document
  useEffect(() => {
    if (!minimapRef.current) return;

    const minimapWidth = minimapRef.current.clientWidth - MINIMAP_PADDING * 2;
    const minimapHeight = MINIMAP_HEIGHT - MINIMAP_PADDING * 2;

    const scaleX = minimapWidth / document.width;
    const scaleY = minimapHeight / document.height;

    setMinimapScale(Math.min(scaleX, scaleY));
  }, [document.width, document.height]);

  // Calculate viewport rectangle dimensions and position on minimap
  const getViewportRect = useCallback(() => {
    if (!containerRef.current || !minimapRef.current) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const minimapWidth = minimapRef.current.clientWidth - MINIMAP_PADDING * 2;
    const minimapHeight = MINIMAP_HEIGHT - MINIMAP_PADDING * 2;

    // Visible area dimensions in canvas space
    const visibleWidth = containerRect.width / viewport.zoom;
    const visibleHeight = containerRect.height / viewport.zoom;

    // Center of visible area in canvas space
    const centerX = -viewport.offsetX / viewport.zoom + containerRect.width / 2 / viewport.zoom;
    const centerY = -viewport.offsetY / viewport.zoom + containerRect.height / 2 / viewport.zoom;

    // Convert to minimap space
    const width = visibleWidth * minimapScale;
    const height = visibleHeight * minimapScale;

    // Center the document in minimap
    const documentWidth = document.width * minimapScale;
    const documentHeight = document.height * minimapScale;
    const offsetX = (minimapWidth - documentWidth) / 2;
    const offsetY = (minimapHeight - documentHeight) / 2;

    const x = offsetX + (centerX - visibleWidth / 2) * minimapScale;
    const y = offsetY + (centerY - visibleHeight / 2) * minimapScale;

    return { x, y, width, height };
  }, [viewport, minimapScale, document.width, document.height, containerRef]);

  // Handle click or drag on minimap
  const handleMinimapInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!minimapRef.current || !containerRef.current) return;

      const minimapRect = minimapRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      // Click position relative to minimap
      const x = clientX - minimapRect.left - MINIMAP_PADDING;
      const y = clientY - minimapRect.top - MINIMAP_PADDING;

      const minimapWidth = minimapRect.width - MINIMAP_PADDING * 2;
      const minimapHeight = MINIMAP_HEIGHT - MINIMAP_PADDING * 2;

      // Center the document in minimap
      const documentWidth = document.width * minimapScale;
      const documentHeight = document.height * minimapScale;
      const offsetX = (minimapWidth - documentWidth) / 2;
      const offsetY = (minimapHeight - documentHeight) / 2;

      // Convert click position to canvas space
      const canvasX = (x - offsetX) / minimapScale;
      const canvasY = (y - offsetY) / minimapScale;

      // Calculate new viewport offset to center this point
      const newOffsetX = -(canvasX * viewport.zoom - containerRect.width / 2);
      const newOffsetY = -(canvasY * viewport.zoom - containerRect.height / 2);

      viewportDispatch({
        type: 'update',
        viewport: {
          offsetX: newOffsetX,
          offsetY: newOffsetY
        }
      });
    },
    [minimapScale, document.width, document.height, viewport.zoom, viewportDispatch, containerRef]
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    handleMinimapInteraction(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleMinimapInteraction(event.clientX, event.clientY);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const viewportRect = getViewportRect();

  // Calculate centered document position
  const minimapWidth = minimapRef.current?.clientWidth ?? 0;
  const minimapHeight = MINIMAP_HEIGHT - MINIMAP_PADDING * 2;
  const documentWidth = document.width * minimapScale;
  const documentHeight = document.height * minimapScale;
  const documentOffsetX = (minimapWidth - MINIMAP_PADDING * 2 - documentWidth) / 2;
  const documentOffsetY = (minimapHeight - documentHeight) / 2;

  return (
    <section
      ref={minimapRef}
      className="relative overflow-hidden rounded-2xl border border-border/20 bg-surface/10 shadow-inner"
      style={{ height: MINIMAP_HEIGHT }}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-surface/10 opacity-60" aria-hidden />

      {/* Interactive minimap canvas */}
      <div
        className={`relative ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
        style={{ padding: MINIMAP_PADDING, height: '100%' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        role="button"
        tabIndex={0}
        aria-label="Minimap navigation - click or drag to navigate"
      >
        {/* Document representation */}
        <div
          className="absolute rounded border border-border/40 bg-background/80 shadow-sm"
          style={{
            left: MINIMAP_PADDING + documentOffsetX,
            top: MINIMAP_PADDING + documentOffsetY,
            width: documentWidth,
            height: documentHeight
          }}
          aria-hidden
        />

        {/* Viewport rectangle */}
        <div
          className="absolute rounded border-2 border-accent bg-accent/10 transition-all"
          style={{
            left: MINIMAP_PADDING + viewportRect.x,
            top: MINIMAP_PADDING + viewportRect.y,
            width: viewportRect.width,
            height: viewportRect.height,
            pointerEvents: 'none'
          }}
          aria-hidden
        />
      </div>

      {/* Label */}
      <div className="pointer-events-none absolute bottom-2 right-2">
        <span className="rounded-full border border-border/40 bg-background/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted">
          Minimap
        </span>
      </div>
    </section>
  );
};
