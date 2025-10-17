import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createFrameDocument } from '../../stores/editor-store';
import { createDatabaseAdapter } from '../database-adapter';

describe('createDatabaseAdapter', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    Object.assign(import.meta.env, {
      VITE_SUPABASE_URL: undefined,
      VITE_SUPABASE_ANON_KEY: undefined
    });
    localStorage.clear();
  });

  afterEach(() => {
    Object.assign(import.meta.env, originalEnv);
  });

  it('persists documents locally when supabase is unavailable', async () => {
    const adapter = createDatabaseAdapter();
    const document = createFrameDocument({
      name: 'Test',
      width: 100,
      height: 100,
      dpi: 72,
      baseColor: '#ffffff',
      paperColor: '#ffffff'
    });

    const saved = await adapter.saveFrame(document);
    expect(saved.metadata.revision).toBe(1);

    const list = await adapter.listFrames();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(document.id);

    const loaded = await adapter.loadFrame(document.id);
    expect(loaded?.id).toBe(document.id);
  });
});
