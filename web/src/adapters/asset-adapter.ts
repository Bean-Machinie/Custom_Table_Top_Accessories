import type { FileWithPreview } from '../features/assets/types';

import { getSupabaseClient } from './supabase-client';

export interface AssetStoreAdapter {
  upload(file: File): Promise<string>;
}

const bucket = (import.meta.env.VITE_SUPABASE_BUCKET as string | undefined) ?? 'assets';

export const createAssetStoreAdapter = (): AssetStoreAdapter => {
  const supabase = (() => {
    try {
      return getSupabaseClient();
    } catch (error) {
      console.warn('Supabase unavailable, using local object URLs.', error);
      return null;
    }
  })();

  return {
    async upload(file) {
      if (supabase) {
        const filename = `${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage.from(bucket).upload(filename, file, {
          cacheControl: '3600',
          upsert: false
        });
        if (error) throw error;
        const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
        return data.publicUrl;
      }

      const url = URL.createObjectURL(file);
      return url;
    }
  };
};

export const isFileWithPreview = (file: File | FileWithPreview): file is FileWithPreview =>
  Boolean((file as FileWithPreview).previewUrl);
