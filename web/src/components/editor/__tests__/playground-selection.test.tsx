import type { FrameDocument, Layer } from '@shared/index';
import type { Dispatch, SetStateAction } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hitTestLayers } from '../../../lib/hit-test';

import { EditorPlayground } from '../playground';

vi.mock('../../../adapters/asset-adapter', () => ({
  createAssetStoreAdapter: () => ({ upload: vi.fn() })
}));

vi.mock('../../../stores/auth-store', () => ({
  useAuth: () => ({ mode: 'demo', status: 'signed-out', user: null })
}));

const viewportDispatch = vi.fn();

vi.mock('../../../stores/viewport-store', () => ({
  useViewportState: () => ({ zoom: 1, offsetX: 0, offsetY: 0 }),
  useViewportDispatch: () => viewportDispatch
}));

const editorDispatch = vi.fn();

vi.mock('../../../stores/editor-store', async () => {
  const actual = await vi.importActual<typeof import('../../../stores/editor-store')>(
    '../../../stores/editor-store'
  );
  return {
    ...actual,
    useEditorDispatch: () => editorDispatch
  };
});

vi.mock('../../../hooks/use-inertial-pan', () => ({
  useInertialPan: () => ({
    trackVelocity: vi.fn(),
    startInertia: vi.fn(),
    cancelInertia: vi.fn(),
    resetVelocity: vi.fn()
  })
}));

const createLayer = (layer: Partial<Layer>): Layer => ({
  id: 'layer-1',
  name: 'Layer 1',
  type: 'image',
  order: 1,
  visible: true,
  locked: false,
  parentId: null,
  transform: {
    x: 20,
    y: 30,
    width: 120,
    height: 80,
    rotation: 0,
    scaleX: 1,
    scaleY: 1
  },
  ...layer
});

describe('EditorPlayground selection', () => {
  beforeEach(() => {
    editorDispatch.mockReset();
    viewportDispatch.mockReset();
  });

  it('selects a layer when clicking on the canvas', async () => {
    const document: FrameDocument = {
      id: 'doc-1',
      width: 400,
      height: 300,
      dpi: 300,
      baseColor: '#ffffff',
      paperColor: '#ffffff',
      metadata: { id: 'doc-1', name: 'Doc', createdAt: '', updatedAt: '', revision: 0 },
      layers: [
        {
          id: 'base',
          name: 'Base',
          type: 'base',
          order: 0,
          visible: true,
          locked: true,
          parentId: null,
          transform: {
            x: 0,
            y: 0,
            width: 400,
            height: 300,
            rotation: 0,
            scaleX: 1,
            scaleY: 1
          }
        },
        createLayer({})
      ]
    };

    const selections: string[][] = [];
    const handleSelect: Dispatch<SetStateAction<string[]>> = vi.fn((updater) => {
      const current = selections.length > 0 ? selections[selections.length - 1] : [];
      const next = typeof updater === 'function' ? (updater as (prev: string[]) => string[])(current) : updater;
      selections.push(next);
    });

    expect(hitTestLayers(document.layers as Layer[], { x: 50, y: 60 })?.id).toBe('layer-1');

    const rect = {
      left: 0,
      top: 0,
      right: 400,
      bottom: 300,
      width: 400,
      height: 300,
      x: 0,
      y: 0,
      toJSON: () => ({})
    } as DOMRect;

    const getBoundingClientRect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    getBoundingClientRect.mockReturnValue(rect);

    render(
      <EditorPlayground
        document={document}
        selectedLayerIds={[]}
        onSelectLayers={handleSelect}
        showGrid={false}
      />
    );

    const canvas = screen.getByTestId('editor-document');
    fireEvent.mouseDown(canvas, {
      clientX: 50,
      clientY: 60,
      button: 0
    });

    await waitFor(() => expect(handleSelect).toHaveBeenCalled());
    expect(selections.at(-1)).toEqual(['layer-1']);

    getBoundingClientRect.mockRestore();
  });
});
