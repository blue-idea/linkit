import { describe, expect, test } from 'vitest';
import type { LibraryData as UiLibrary } from '../../types';
import { createLibraryEnvelope } from '../../testing/factories';
import { applyConfirmedImport, toUiLibraryFromEnvelope } from './apply';

describe('导入覆盖确认', () => {
  // REQ-005-AC-002：仅在用户确认后才返回可应用的 UI 资料库。
  test('applyConfirmedImport 在 confirmed=false 时返回 null', () => {
    const envelope = createLibraryEnvelope();
    expect(applyConfirmedImport(envelope, false)).toBeNull();
  });

  test('applyConfirmedImport 在 confirmed=true 时投影为 UI LibraryData', () => {
    const envelope = createLibraryEnvelope();
    const applied = applyConfirmedImport(envelope, true);
    expect(applied).not.toBeNull();
    const lib = applied as UiLibrary;
    expect(lib.bookmarks[0]?.tags).toEqual(envelope.data.bookmarks[0]?.tagIds);
    expect(lib.categories).toHaveLength(1);
    expect(lib.collections).toHaveLength(1);
    expect(lib.tags).toHaveLength(1);
    expect(toUiLibraryFromEnvelope(envelope).bookmarks[0]?.id).toBe(envelope.data.bookmarks[0]?.id);
  });
});
