import { describe, expect, test } from 'vitest';
import { createCoreJourneySeed } from '../../testing/factories';
import { recommendLibraryBookmarks, suggestThemeGaps } from './index';

describe('库内探索推荐', () => {
  test('推荐结果仅包含活动资料库 ID 并按分数降序', () => {
    const library = createCoreJourneySeed().library.data;
    const results = recommendLibraryBookmarks(library, 'bookmark-reference');
    const libraryIds = new Set(library.bookmarks.map(({ id }) => id));
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(({ bookmarkId }) => libraryIds.has(bookmarkId))).toBe(true);
    expect(results.map(({ score }) => score)).toEqual([...results.map(({ score }) => score)].sort((a, b) => b - a));
  });

  test('主题缺口仅返回尚未加入的候选且不修改资料库', () => {
    const library = createCoreJourneySeed().library.data;
    const before = structuredClone(library);
    const suggestions = suggestThemeGaps(library);
    expect(suggestions.every((suggestion) => {
      const collection = library.collections.find(({ id }) => id === suggestion.collectionId);
      return collection && !collection.bookmarkIds.includes(suggestion.bookmarkId);
    })).toBe(true);
    expect(library).toStrictEqual(before);
  });
});
