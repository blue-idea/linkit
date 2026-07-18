import { describe, expect, test } from 'vitest';
import { createCoreJourneySeed } from '../../../testing/factories';
import { applyDuplicateDecision, buildDuplicatePreview } from './index';

function duplicateLibrary() {
  const library = structuredClone(createCoreJourneySeed().library.data);
  const source = structuredClone(library.bookmarks[1]);
  source.id = 'bookmark-duplicate';
  source.title = 'React Reference Copy';
  source.url = library.bookmarks[0].url;
  source.tagIds = ['tag-health'];
  source.collectionIds = ['collection-reference'];
  library.bookmarks.push(source);
  library.collections[0].bookmarkIds.push(source.id);
  return library;
}

describe('重复书签确认', () => {
  test('预览展示匹配依据和字段差异且不修改资料库', () => {
    const library = duplicateLibrary();
    const before = structuredClone(library);
    const preview = buildDuplicatePreview(library, 'bookmark-reference', 'bookmark-duplicate');
    expect(preview).toMatchObject({ reason: expect.stringMatching(/URL/i) });
    expect(preview?.differences.map(({ field }) => field)).toContain('title');
    expect(library).toStrictEqual(before);
  });

  test('合并时保留标签与主题关系并清理重复成员引用', () => {
    const result = applyDuplicateDecision(duplicateLibrary(), {
      targetId: 'bookmark-reference', duplicateId: 'bookmark-duplicate', action: 'merge',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const target = result.value.bookmarks.find(({ id }) => id === 'bookmark-reference');
    expect(target?.tagIds).toEqual(expect.arrayContaining(['tag-reference', 'tag-health']));
    expect(target?.collectionIds).toContain('collection-reference');
    expect(result.value.bookmarks.some(({ id }) => id === 'bookmark-duplicate')).toBe(false);
    expect(result.value.collections[0].bookmarkIds).not.toContain('bookmark-duplicate');
  });

  test('删除只移除所选重复项并清理主题引用', () => {
    const result = applyDuplicateDecision(duplicateLibrary(), {
      targetId: 'bookmark-reference', duplicateId: 'bookmark-duplicate', action: 'delete',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bookmarks.some(({ id }) => id === 'bookmark-reference')).toBe(true);
    expect(result.value.bookmarks.some(({ id }) => id === 'bookmark-duplicate')).toBe(false);
    expect(result.value.collections[0].bookmarkIds).not.toContain('bookmark-duplicate');
  });
});
