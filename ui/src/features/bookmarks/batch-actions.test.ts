import { describe, expect, test } from 'vitest';
import { createCoreJourneySeed } from '../../testing/factories';
import { batchDeleteBookmarks, batchMoveBookmarks, selectBookmarkRange, updateBookmarkFromEditor } from './batch-actions';

describe('书签统一编辑与批量操作', () => {
  test('统一编辑原子更新 URL、domain、文本和组织字段', () => {
    const library = createCoreJourneySeed().library.data;
    const bookmark = library.bookmarks[0];
    const category = library.categories[1];
    const result = updateBookmarkFromEditor(library, {
      bookmarkId: bookmark.id,
      url: 'https://example.com/updated/path',
      title: 'Updated title', description: 'Updated description', notes: 'Updated notes',
      categoryId: category.id, tagIds: [library.tags[0].id], collectionIds: [library.collections[0].id],
      readStatus: 'reading',
      favicon: 'Z',
      faviconColor: 'amber',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bookmarks.find(({ id }) => id === bookmark.id)).toEqual(expect.objectContaining({
      url: 'https://example.com/updated/path', domain: 'example.com', title: 'Updated title',
      description: 'Updated description', notes: 'Updated notes', categoryId: category.id, readStatus: 'reading',
      favicon: 'Z',
      faviconColor: 'amber',
    }));
  });

  test('批量移动全部选中书签到目标分类或未分类', () => {
    const library = createCoreJourneySeed().library.data;
    const ids = library.bookmarks.slice(0, 2).map(({ id }) => id);
    const target = library.categories[1].id;
    const moved = batchMoveBookmarks(library, { bookmarkIds: ids, categoryId: target });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(moved.value.bookmarks.filter(({ id }) => ids.includes(id)).every(({ categoryId }) => categoryId === target)).toBe(true);
    const uncategorized = batchMoveBookmarks(moved.value, { bookmarkIds: ids, categoryId: null });
    expect(uncategorized.ok && uncategorized.value.bookmarks.filter(({ id }) => ids.includes(id)).every(({ categoryId }) => categoryId === null)).toBe(true);
  });

  test('批量删除清理主题引用且缺失 ID 时整批零修改', () => {
    const library = createCoreJourneySeed().library.data;
    const ids = library.bookmarks.slice(0, 2).map(({ id }) => id);
    const deleted = batchDeleteBookmarks(library, { bookmarkIds: ids });
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) return;
    expect(deleted.value.bookmarks.some(({ id }) => ids.includes(id))).toBe(false);
    expect(deleted.value.collections.every(({ bookmarkIds }) => bookmarkIds.every((id) => !ids.includes(id)))).toBe(true);

    const invalid = batchDeleteBookmarks(library, { bookmarkIds: [ids[0], 'missing-bookmark'] });
    expect(invalid.ok).toBe(false);
    expect(library.bookmarks).toHaveLength(createCoreJourneySeed().library.data.bookmarks.length);
  });

  test('Shift 范围选择包含锚点与当前项并保持页面顺序', () => {
    expect(selectBookmarkRange(['a', 'b', 'c', 'd'], 'b', 'd')).toEqual(['b', 'c', 'd']);
    expect(selectBookmarkRange(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['b', 'c', 'd']);
  });
});
