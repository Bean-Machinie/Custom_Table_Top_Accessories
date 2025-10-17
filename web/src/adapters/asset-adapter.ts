import type { FileWithPreview } from '../features/assets/types';

import { getSupabaseClient } from './supabase-client';

export interface AssetStoreAdapter {
  upload(file: File): Promise<string>;
}

const bucket = (import.meta.env.VITE_SUPABASE_BUCKET as string | undefined) ?? 'assets';
const basePath = (import.meta.env.VITE_SUPABASE_STORAGE_PATH as string | undefined) ?? 'uploads';

interface AssetAdapterOptions {
  userId?: string;
  remoteEnabled?: boolean;
}

const sanitiseFilename = (filename: string) => filename.replace(/[^a-z0-9.\-]+/gi, '_');

export const createAssetStoreAdapter = (options: AssetAdapterOptions = {}): AssetStoreAdapter => {
  const { userId, remoteEnabled = false } = options;
  const supabase = remoteEnabled
    ? (() => {
        try {
          return getSupabaseClient();
        } catch (error) {
          console.warn('Supabase unavailable, using local object URLs.', error);
          return null;
        }
      })()
    : null;

  return {
    async upload(file) {
      if (supabase) {
        if (!userId) {
          throw new Error('Authenticated user required to upload assets.');
        }
        const safeName = sanitiseFilename(file.name);
        const filename = `${crypto.randomUUID()}-${safeName}`;
        const path = [basePath, userId, filename].filter(Boolean).join('/');
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });
        if (error) throw error;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
      }

      const url = URL.createObjectURL(file);
      return url;
    }
  };
};

export const isFileWithPreview = (file: File | FileWithPreview): file is FileWithPreview =>
  Boolean((file as FileWithPreview).previewUrl);
