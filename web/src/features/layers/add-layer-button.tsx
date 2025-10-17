import { ChangeEvent, useMemo, useRef, useState } from 'react';

import { createAssetStoreAdapter } from '../../adapters/asset-adapter';
import { Button } from '../../components/ui/button';
import { createLayer, useEditorDispatch, useEditorState } from '../../stores/editor-store';

export const AddLayerButton = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dispatch = useEditorDispatch();
  const { activeDocumentId, documents } = useEditorState();
  const [isLoading, setIsLoading] = useState(false);
  const adapter = useMemo(() => createAssetStoreAdapter(), []);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!activeDocumentId) return;
    const document = documents[activeDocumentId];
    if (!document) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const url = await adapter.upload(file);
      const layer = createLayer({
        name: file.name,
        type: 'image',
        order: document.layers.length,
        baseWidth: document.width / 2,
        baseHeight: document.height / 2,
        assetUrl: url
      });
      dispatch({ type: 'add-layer', documentId: document.id, layer });
    } catch (error) {
      console.error('Failed to upload asset', error);
      alert('Unable to upload image. Please check your Supabase configuration.');
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <Button
        size="sm"
        variant="surface"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading || !activeDocumentId}
      >
        {isLoading ? 'Uploading…' : '+ Add Layer'}
      </Button>
      <p className="text-xs text-muted">
        Drop an image or use the button to add a new layer. Assets are uploaded to Supabase or stored locally when offline.
      </p>
    </div>
  );
};
