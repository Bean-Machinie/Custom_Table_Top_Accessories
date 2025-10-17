import { useState } from 'react';

import { Button } from '../../components/ui/button';
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { useViewportDispatch, useViewportState } from '../../stores/viewport-store';

import { NewDocumentDialog } from './new-document-dialog';

export interface FileMenuProps {
  showGrid: boolean;
  onShowGridChange: (show: boolean) => void;
}

export const FileMenu = ({ showGrid, onShowGridChange }: FileMenuProps) => {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const viewport = useViewportState();
  const viewportDispatch = useViewportDispatch();

  return (
    <>
      <DropdownMenuRoot open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger showChevron className="rounded-full border border-border/60 bg-background/50 px-4 py-2 hover:bg-muted/20 transition-colors">
          <span className="text-sm font-medium text-surface">File</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setDialogOpen(true)}>New…</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={showGrid} onCheckedChange={onShowGridChange}>
            Show grid
          </DropdownMenuCheckboxItem>
          <DropdownMenuItem
            onSelect={() =>
              viewportDispatch({
                type: 'update',
                viewport: {
                  zoom: 1,
                  offsetX: 0,
                  offsetY: 0
                }
              })
            }
          >
            Reset view
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              viewportDispatch({
                type: 'update',
                viewport: { zoom: Math.min(viewport.zoom * 1.2, 4) }
              })
            }
          >
            Zoom in
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              viewportDispatch({
                type: 'update',
                viewport: { zoom: Math.max(viewport.zoom / 1.2, 0.1) }
              })
            }
          >
            Zoom out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuRoot>
      <NewDocumentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
};
