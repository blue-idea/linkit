import { describe, expect, test } from 'vitest';
import { bookmarks, categories, collections, tags } from '../../data';

async function loadApply() {
  return import(/* @vite-ignore */ './apply-collection-command').catch(() => null);
}

describe('主题功能适配层', () => {
  // REQ-012-AC-001：创建后 UI 投影包含新主题。
  test('runCreateCollection 返回可应用到 UI 的主题', async () => {
    const mod = await loadApply();
    expect(mod?.runCreateCollection).toBeTypeOf('function');
    expect(mod?.applyCollectionLibraryResult).toBeTypeOf('function');
    if (!mod?.runCreateCollection || !mod.applyCollectionLibraryResult) {
      throw new Error('collection apply helpers are required');
    }

    const result = mod.runCreateCollection({
      bookmarks,
      categories,
      collections,
      tags,
      name: 'TASK016 Theme',
      emoji: '🎯',
      color: 'coral',
      description: 'From adapter test',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const applied = mod.applyCollectionLibraryResult(result.value, bookmarks);
    expect(applied.collections.some((c) => c.name === 'TASK016 Theme')).toBe(true);
  });

  // REQ-012-AC-002：删除主题后书签保留且清理引用。
  test('runDeleteCollection 删除主题但保留书签', async () => {
    const mod = await loadApply();
    expect(mod?.runDeleteCollection).toBeTypeOf('function');
    if (!mod?.runDeleteCollection) throw new Error('runDeleteCollection is required');

    const target = collections[0];
    const result = mod.runDeleteCollection({
      bookmarks,
      categories,
      collections,
      tags,
      id: target.id,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.collections.some((c) => c.id === target.id)).toBe(false);
    expect(result.value.bookmarks.length).toBe(bookmarks.length);
    expect(
      result.value.bookmarks.every((b) => !b.collectionIds.includes(target.id))
    ).toBe(true);
  });

  // REQ-012-AC-003 / REQ-026-AC-003：成员切换双向一致。
  test('runSetMembership 同步 bookmarkIds 与 collectionIds', async () => {
    const mod = await loadApply();
    expect(mod?.runSetMembership).toBeTypeOf('function');
    if (!mod?.runSetMembership) throw new Error('runSetMembership is required');

    const collectionId = collections[0].id;
    const outsider = bookmarks.find((b) => !b.collectionIds.includes(collectionId));
    expect(outsider).toBeTruthy();
    if (!outsider) return;

    const result = mod.runSetMembership({
      bookmarks,
      categories,
      collections,
      tags,
      bookmarkId: outsider.id,
      collectionId,
      member: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const col = result.value.collections.find((c) => c.id === collectionId);
    const bm = result.value.bookmarks.find((b) => b.id === outsider.id);
    expect(col?.bookmarkIds.includes(outsider.id)).toBe(true);
    expect(bm?.collectionIds.includes(collectionId)).toBe(true);
  });
});
