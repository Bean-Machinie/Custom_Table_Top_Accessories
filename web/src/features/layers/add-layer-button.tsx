import { ChangeEvent, ReactNode, useMemo, useRef, useState } from 'react';

import { createAssetStoreAdapter } from '../../adapters/asset-adapter';
import { Button } from '../../components/ui/button';
import { createLayer, useEditorDispatch, useEditorState } from '../../stores/editor-store';
import { useAuth } from '../../stores/auth-store';

interface AddLayerButtonProps {
  variant?: 'panel' | 'compact';
  label?: string;
  children?: ReactNode;
  className?: string;
}

export const AddLayerButton = ({ variant = 'panel', label = '+ Add Layer', className, children }: AddLayerButtonProps) => {
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
      const order = document.layers.filter((layer) => layer.type !== 'base').length;
      const layer = createLayer({
        name: file.name,
        type: 'image',
        order,
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

  const button = (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <Button
        size="sm"
        variant={variant === 'compact' ? 'ghost' : 'surface'}
        className={className}
        onClick={() => inputRef.current?.click()}
        disabled={isLoading || !activeDocumentId}
      >
        {isLoading ? 'Uploading…' : label}
      </Button>
      {error && (
        <div
          className="mt-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
          role="alert"
        >
          {error}
        </div>
      )}
    </>
  );

  if (variant === 'compact') {
    return <div className="flex flex-col items-end gap-2 text-xs text-muted">{button}</div>;
  }

  return (
    <div className="flex flex-col gap-2 text-xs text-muted">
      {button}
      <p>
        Drop an image or use the button to add a new layer.{' '}
        {remoteEnabled
          ? 'Assets are uploaded securely to your Supabase storage.'
          : 'Assets stay local in this demo session and are cleared when the browser storage resets.'}
      </p>
      {children}
    </div>
  );
};
