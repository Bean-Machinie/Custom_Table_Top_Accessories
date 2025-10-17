import { useMemo } from 'react';

import { IconButton } from '../../components/ui/button';
import { useViewportDispatch, useViewportState } from '../../stores/viewport-store';

export const ViewportControls = () => {
  const viewport = useViewportState();
  const dispatch = useViewportDispatch();

  const zoomPercent = useMemo(() => Math.round(viewport.zoom * 100), [viewport.zoom]);

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <IconButton
        label="Zoom out"
        variant="ghost"
        onClick={() => dispatch({ type: 'update', viewport: { zoom: Math.max(viewport.zoom / 1.2, 0.1) } })}
      >
        −
      </IconButton>
      <span className="min-w-[56px] text-center font-semibold text-surface">{zoomPercent}%</span>
      <IconButton
        label="Zoom in"
        variant="ghost"
        onClick={() => dispatch({ type: 'update', viewport: { zoom: Math.min(viewport.zoom * 1.2, 6) } })}
      >
        +
      </IconButton>
    </div>
  );
};
