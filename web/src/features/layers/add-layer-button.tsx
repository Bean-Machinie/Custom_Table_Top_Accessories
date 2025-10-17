import { ChangeEvent, useMemo, useRef, useState } from 'react';

import { createAssetStoreAdapter } from '../../adapters/asset-adapter';
import { Button } from '../../components/ui/button';
import { createLayer, useEditorDispatch, useEditorState } from '../../stores/editor-store';
import { useAuth } from '../../stores/auth-store';

export const AddLayerButton = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dispatch = useEditorDispatch();
  const { activeDocumentId, documents } = useEditorState();
  const { mode, status, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remoteEnabled = mode === 'auth' && status === 'authenticated' && Boolean(user);

  const adapter = useMemo(
    () => createAssetStoreAdapter({ userId: user?.id, remoteEnabled }),
    [user?.id, remoteEnabled]
  );

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!activeDocumentId) return;
    const document = documents[activeDocumentId];
    if (!document) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      setError(null);
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
      setError('Unable to upload the image. Please try again or check your Supabase settings.');
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
        Drop an image or use the button to add a new layer. {remoteEnabled ? 'Assets are uploaded securely to your Supabase storage.' : 'Assets stay local in this demo session and are cleared when the browser storage resets.'}
      </p>
      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
