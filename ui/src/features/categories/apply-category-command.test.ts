import { describe, expect, test, vi } from 'vitest';
import {
  CATEGORY_COLOR_CANDIDATES,
  CATEGORY_ICON_CANDIDATES,
} from '../../config/category-icons';
import type { Bookmark, Category, Collection } from '../../types';
import {
  applyCategoryLibraryResult,
  runCreateCategory,
  runDeleteCategory,
} from './apply-category-command';

describe('runCreateCategory', () => {
  test('新建分类时从受控候选集中随机生成图标与颜色', () => {
    const randomValue = 0.5;
    const random = vi
      .fn<() => number>()
      .mockReturnValueOnce(randomValue)
      .mockReturnValueOnce(randomValue);

    const result = runCreateCategory({
      bookmarks: [],
      categories: [],
      collections: [],
      tags: [],
      name: 'Random appearance',
      random,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.categories[0]).toMatchObject({
      icon: CATEGORY_ICON_CANDIDATES[
        Math.floor(CATEGORY_ICON_CANDIDATES.length * randomValue)
      ],
      color: CATEGORY_COLOR_CANDIDATES[
        Math.floor(CATEGORY_COLOR_CANDIDATES.length * randomValue)
      ],
    });
    expect(random).toHaveBeenCalledTimes(2);
  });

  // REQ-010-AC-005：UI 适配器必须同步移除递归删除后的书签和 Collection 引用。
  test('递归删除结果应用到 UI 时不保留已删除书签引用', () => {
    const makeBookmark = (id: string, categoryId: string): Bookmark => ({
      id,
      title: id,
      url: `https://${id}.example.test`,
      domain: `${id}.example.test`,
      favicon: id.slice(0, 1).toUpperCase(),
      faviconColor: 'blue',
      description: '',
      notes: '',
      tags: [],
      categoryId,
      collectionIds: ['collection-ui'],
      createdAt: '2026-08-08T08:00:00.000Z',
      lastVisitedAt: null,
      visitCount: 0,
      starred: false,
      pinned: false,
      readStatus: 'unread',
    });
    const makeCategory = (id: string, name: string, parentId: string | null): Category => ({
      id,
      name,
      icon: 'Folder',
      parentId,
      color: 'blue',
    });
    const makeCollection = (): Collection => ({
      id: 'collection-ui',
      name: 'UI',
      emoji: '📚',
      color: 'blue',
      description: '',
      bookmarkIds: ['bookmark-root', 'bookmark-child'],
    });
    const bookmarks = [
      makeBookmark('bookmark-root', 'category-root'),
      makeBookmark('bookmark-child', 'category-child'),
    ];
    const categories = [
      makeCategory('category-root', 'Root', null),
      makeCategory('category-child', 'Child', 'category-root'),
    ];
    const collections = [makeCollection()];
    const result = runDeleteCategory({
      bookmarks,
      categories,
      collections,
      tags: [],
      id: 'category-child',
      strategy: 'recursive-delete',
      recursiveConfirmed: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const applied = applyCategoryLibraryResult(result.value, bookmarks, categories, collections);
    expect(applied.bookmarks.map((bookmark) => bookmark.id)).toEqual(['bookmark-root']);
    expect(applied.collections?.[0]?.bookmarkIds).toEqual(['bookmark-root']);
  });
});
