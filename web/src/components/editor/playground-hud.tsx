/**
 * Bottom HUD Bar for playground controls and status
 * Provides tool toggles, zoom controls, status displays, and quick actions
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FrameDocument } from '@shared/index';

import { IconButton } from '../ui/button';
import { useViewportDispatch, useViewportState } from '../../stores/viewport-store';
import { clampZoom, DEFAULT_ZOOM_CONFIG, zoomAboutPoint } from '../../lib/zoom-utils';

interface PlaygroundHudProps {
  document: FrameDocument;
  showGrid: boolean;
  onToggleGrid: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const PlaygroundHud = ({ document, showGrid, onToggleGrid, containerRef }: PlaygroundHudProps) => {
  const viewport = useViewportState();
  const viewportDispatch = useViewportDispatch();
  const [isEditingZoom, setIsEditingZoom] = useState(false);
  const [zoomInputValue, setZoomInputValue] = useState('');
  const zoomInputRef = useRef<HTMLInputElement>(null);

  const zoomPercent = useMemo(() => Math.round(viewport.zoom * 100), [viewport.zoom]);

  // Update zoom input when not editing
  useEffect(() => {
    if (!isEditingZoom) {
      setZoomInputValue(zoomPercent.toString());
    }
  }, [zoomPercent, isEditingZoom]);

  const handleZoomIn = useCallback(() => {
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
  }, [viewport, viewportDispatch, containerRef, document.width, document.height]);

  const handleZoomOut = useCallback(() => {
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
  }, [viewport, viewportDispatch, containerRef, document.width, document.height]);

  const handleFitToScreen = useCallback(() => {
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
  }, [document, viewportDispatch, containerRef]);

  const handleReset = useCallback(() => {
    viewportDispatch({
      type: 'update',
      viewport: { zoom: 1, offsetX: 0, offsetY: 0 }
    });
  }, [viewportDispatch]);

  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoomInputValue(e.target.value);
  };

  const handleZoomInputBlur = () => {
    const value = parseInt(zoomInputValue, 10);
    if (!isNaN(value) && value > 0) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newTransform = zoomAboutPoint(
          viewport,
          value / 100,
          rect.width / 2,
          rect.height / 2,
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
      } else {
        const newZoom = clampZoom(value / 100, DEFAULT_ZOOM_CONFIG, document.width, document.height);
        viewportDispatch({
          type: 'update',
          viewport: { zoom: newZoom }
        });
      }
    }
    setIsEditingZoom(false);
  };

  const handleZoomInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleZoomInputBlur();
    } else if (e.key === 'Escape') {
      setIsEditingZoom(false);
      setZoomInputValue(zoomPercent.toString());
    }
  };

  const handleZoomInputFocus = () => {
    setIsEditingZoom(true);
    setTimeout(() => {
      zoomInputRef.current?.select();
    }, 0);
  };

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border/60 bg-background/95 px-4 py-2 shadow-lg backdrop-blur-sm">
      {/* Zoom Controls */}
      <div className="pointer-events-auto flex items-center gap-2">
        <IconButton label="Zoom out" variant="ghost" size="sm" onClick={handleZoomOut} disabled={viewport.zoom <= DEFAULT_ZOOM_CONFIG.minZoom}>
          <span className="text-base">−</span>
        </IconButton>

        <div className="flex items-center gap-1">
          <input
            ref={zoomInputRef}
            type="text"
            value={zoomInputValue}
            onChange={handleZoomInputChange}
            onBlur={handleZoomInputBlur}
            onKeyDown={handleZoomInputKeyDown}
            onFocus={handleZoomInputFocus}
            className="w-14 rounded border border-border/40 bg-background px-2 py-1 text-center text-xs font-semibold text-surface focus:border-accent focus:outline-none"
            aria-label="Zoom percentage"
          />
          <span className="text-xs text-muted">%</span>
        </div>

        <IconButton label="Zoom in" variant="ghost" size="sm" onClick={handleZoomIn} disabled={viewport.zoom >= DEFAULT_ZOOM_CONFIG.maxZoom}>
          <span className="text-base">+</span>
        </IconButton>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border/40" />

      {/* Quick Actions */}
      <div className="pointer-events-auto flex items-center gap-1">
        <button
          onClick={handleFitToScreen}
          className="rounded px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface/10 hover:text-surface focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="Fit to screen"
        >
          Fit
        </button>
        <button
          onClick={handleReset}
          className="rounded px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface/10 hover:text-surface focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="Reset zoom to 100%"
        >
          100%
        </button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border/40" />

      {/* Grid Toggle */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={onToggleGrid}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
            showGrid ? 'bg-accent/20 text-accent' : 'text-muted hover:bg-surface/10 hover:text-surface'
          }`}
          aria-label={showGrid ? 'Hide grid' : 'Show grid'}
          aria-pressed={showGrid}
        >
          Grid
        </button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border/40" />

      {/* Status Display */}
      <div className="pointer-events-none flex items-center gap-3 text-xs text-muted">
        <span>{document.width} × {document.height}</span>
      </div>
    </div>
  );
};
