import type { FrameDocument } from '@shared/index';
import type { PostgrestError } from '@supabase/supabase-js';

import { getSupabaseClient } from './supabase-client';

export interface DatabaseAdapter {
  loadFrame(frameId: string): Promise<FrameDocument | null>;
  listFrames(): Promise<FrameDocument[]>;
  saveFrame(document: FrameDocument): Promise<FrameDocument>;
}

const framesTable = 'frames';

interface DatabaseAdapterOptions {
  userId?: string;
  remoteEnabled?: boolean;
}

const isMissingOwnerColumn = (error: PostgrestError | null) =>
  Boolean(error && typeof error.message === 'string' && error.message.toLowerCase().includes('owner_id'));

export const createDatabaseAdapter = (options: DatabaseAdapterOptions = {}): DatabaseAdapter => {
  const { userId, remoteEnabled = false } = options;
  const supabase = remoteEnabled
    ? (() => {
        try {
          return getSupabaseClient();
        } catch (error) {
          console.warn('Supabase unavailable, using local persistence.', error);
          return null;
        }
      })()
    : null;

  const localKey = `cta::frames::${userId ?? 'demo'}`;
  let ownerColumnAvailable = Boolean(userId);

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
        const baseQuery = supabase.from(framesTable).select('*').eq('id', frameId);
        const query = ownerColumnAvailable && userId ? baseQuery.eq('owner_id', userId) : baseQuery;
        const { data, error } = await query.maybeSingle();
        if (error) {
          if (isMissingOwnerColumn(error) && ownerColumnAvailable) {
            ownerColumnAvailable = false;
            const retry = await supabase.from(framesTable).select('*').eq('id', frameId).maybeSingle();
            if (retry.error) throw retry.error;
            return (retry.data as FrameDocument | null) ?? null;
          }
          throw error;
        }
        return (data as FrameDocument | null) ?? null;
      }

      return readLocal().find((frame) => frame.id === frameId) ?? null;
    },
    async listFrames() {
      if (supabase) {
        const baseQuery = supabase.from(framesTable).select('*');
        const query = ownerColumnAvailable && userId ? baseQuery.eq('owner_id', userId) : baseQuery;
        const { data, error } = await query;
        if (error) {
          if (isMissingOwnerColumn(error) && ownerColumnAvailable) {
            ownerColumnAvailable = false;
            const retry = await supabase.from(framesTable).select('*');
            if (retry.error) throw retry.error;
            return (retry.data as FrameDocument[]) ?? [];
          }
          throw error;
        }
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
        const payload = ownerColumnAvailable && userId ? { ...toPersist, owner_id: userId } : toPersist;
        const { data, error } = await supabase
          .from(framesTable)
          .upsert(payload, { onConflict: 'id' })
          .select()
          .maybeSingle();
        if (error) {
          if (isMissingOwnerColumn(error) && ownerColumnAvailable) {
            ownerColumnAvailable = false;
            const retry = await supabase
              .from(framesTable)
              .upsert(toPersist, { onConflict: 'id' })
              .select()
              .maybeSingle();
            if (retry.error) throw retry.error;
            return (retry.data as FrameDocument) ?? toPersist;
          }
          throw error;
        }
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
