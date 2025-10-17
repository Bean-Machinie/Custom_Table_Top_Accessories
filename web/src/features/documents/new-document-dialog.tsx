import { FormEvent, useState } from 'react';

import { Button } from '../../components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle
} from '../../components/ui/dialog';
import { createFrameDocument, useEditorDispatch } from '../../stores/editor-store';

export interface NewDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewDocumentDialog = ({ open, onOpenChange }: NewDocumentDialogProps) => {
  const dispatch = useEditorDispatch();
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [dpi, setDpi] = useState(300);
  const [baseColor, setBaseColor] = useState('#ffffff');
  const [paperColor, setPaperColor] = useState('#f8f9ff');
  const [name, setName] = useState('Untitled Frame');
  const [useTemplate, setUseTemplate] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const document = createFrameDocument({
      name,
      width,
      height,
      dpi,
      baseColor,
      paperColor: useTemplate ? '#f1ede4' : paperColor
    });
    dispatch({ type: 'new-document', document });
    onOpenChange(false);
  };

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Create a new document</DialogTitle>
        <DialogDescription>
          Configure the canvas metrics. You can adjust width, height, DPI, colors and optional paper texture.
        </DialogDescription>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-muted">
              Width (px)
              <input
                className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus-visible:focus-ring"
                type="number"
                min={64}
                value={width}
                onChange={(event) => setWidth(Number(event.target.value))}
              />
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-muted">
              Height (px)
              <input
                className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus-visible:focus-ring"
                type="number"
                min={64}
                value={height}
                onChange={(event) => setHeight(Number(event.target.value))}
              />
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-muted">
              DPI
              <input
                className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus-visible:focus-ring"
                type="number"
                min={72}
                value={dpi}
                onChange={(event) => setDpi(Number(event.target.value))}
              />
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-muted">
              Document name
              <input
                className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus-visible:focus-ring"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-muted">
              Base color
              <input
                className="h-10 w-full rounded-md border border-border/60 bg-background focus-visible:focus-ring"
                type="color"
                value={baseColor}
                onChange={(event) => setBaseColor(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2 text-xs uppercase tracking-wide text-muted">
              Paper color
              <input
                className="h-10 w-full rounded-md border border-border/60 bg-background focus-visible:focus-ring"
                type="color"
                value={paperColor}
                onChange={(event) => setPaperColor(event.target.value)}
              />
            </label>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={useTemplate}
              onChange={(event) => setUseTemplate(event.target.checked)}
              className="h-4 w-4 rounded border border-border/60"
            />
            Use tabletop template (adds subtle parchment background)
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <DialogClose>Cancel</DialogClose>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </DialogRoot>
  );
};
