import type { FrameDocument } from '@shared/index';

import { getSupabaseClient } from './supabase-client';

export interface DatabaseAdapter {
  loadFrame(frameId: string): Promise<FrameDocument | null>;
  listFrames(): Promise<FrameDocument[]>;
  saveFrame(document: FrameDocument): Promise<FrameDocument>;
}

const framesTable = 'frames';

export const createDatabaseAdapter = (): DatabaseAdapter => {
  const supabase = (() => {
    try {
      return getSupabaseClient();
    } catch (error) {
      console.warn('Supabase unavailable, falling back to local cache.', error);
      return null;
    }
  })();

  const localKey = 'cta::frames';

  const readLocal = (): FrameDocument[] => {
    const stored = localStorage.getItem(localKey);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as FrameDocument[];
      return parsed;
    } catch (error) {
      console.error('Failed to parse local frames cache', error);
      return [];
    }
  };

  const writeLocal = (frames: FrameDocument[]) => {
    localStorage.setItem(localKey, JSON.stringify(frames));
  };

  return {
    async loadFrame(frameId) {
      if (supabase) {
        const { data, error } = await supabase
          .from(framesTable)
          .select('*')
          .eq('id', frameId)
          .maybeSingle();
        if (error) throw error;
        return (data as FrameDocument | null) ?? null;
      }

      return readLocal().find((frame) => frame.id === frameId) ?? null;
    },
    async listFrames() {
      if (supabase) {
        const { data, error } = await supabase.from(framesTable).select('*');
        if (error) throw error;
        return (data as FrameDocument[]) ?? [];
      }

      return readLocal();
    },
    async saveFrame(document) {
      const toPersist = {
        ...document,
        metadata: {
          ...document.metadata,
          updatedAt: new Date().toISOString(),
          revision: document.metadata.revision + 1
        }
      } satisfies FrameDocument;

      if (supabase) {
        const { data, error } = await supabase
          .from(framesTable)
          .upsert(toPersist, { onConflict: 'id' })
          .select()
          .maybeSingle();
        if (error) throw error;
        return (data as FrameDocument) ?? toPersist;
      }

      const local = readLocal();
      const existingIndex = local.findIndex((frame) => frame.id === toPersist.id);
      if (existingIndex >= 0) {
        local[existingIndex] = toPersist;
      } else {
        local.push(toPersist);
      }
      writeLocal(local);
      return toPersist;
    }
  };
};
