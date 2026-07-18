import { describe, expect, test } from 'vitest';
import { createBookmark } from '../../testing/factories';
import type { Bookmark } from '../library';

type SortKey = 'recent' | 'created' | 'visits' | 'title';

interface BookmarkQueryFilters {
  onlyStarred: boolean;
  tagIds: string[];
  dateRange: 'all' | '7d' | '30d' | '90d';
  readStatus: 'all' | 'unread' | 'reading' | 'read' | 'archived';
}

interface QueryModule {
  sortBookmarks: (bookmarks: Bookmark[], sortKey: SortKey) => Bookmark[];
  filterBookmarks: (
    bookmarks: Bookmark[],
    filters: BookmarkQueryFilters,
    options?: { now?: () => Date }
  ) => Bookmark[];
  queryBookmarks: (
    bookmarks: Bookmark[],
    input: { filters: BookmarkQueryFilters; sortKey: SortKey; now?: () => Date }
  ) => Bookmark[];
  clearBookmarkFilters: () => BookmarkQueryFilters;
  emptyBookmarkFilters: BookmarkQueryFilters;
}

async function loadQuery(): Promise<Partial<QueryModule>> {
  return import(/* @vite-ignore */ './index').catch(() => ({}));
}

function ids(bookmarks: Bookmark[]): string[] {
  return bookmarks.map((b) => b.id);
}

describe('书签排序与组合筛选引擎', () => {
  // REQ-009-AC-001：四类排序键产生确定性顺序。
  test.each([
    {
      name: 'recent',
      sortKey: 'recent' as const,
      expected: ['b-recent', 'b-mid', 'b-old', 'b-never'],
    },
    {
      name: 'created',
      sortKey: 'created' as const,
      expected: ['b-mid', 'b-recent', 'b-never', 'b-old'],
    },
    {
      name: 'visits',
      sortKey: 'visits' as const,
      expected: ['b-old', 'b-mid', 'b-recent', 'b-never'],
    },
    {
      name: 'title',
      sortKey: 'title' as const,
      expected: ['b-mid', 'b-never', 'b-old', 'b-recent'],
    },
  ])('sortBookmarks 按 $name 重排结果', async ({ sortKey, expected }) => {
    const { sortBookmarks } = await loadQuery();
    expect(sortBookmarks).toBeTypeOf('function');
    if (!sortBookmarks) throw new Error('sortBookmarks is required');

    const bookmarks = [
      createBookmark({
        id: 'b-old',
        title: 'Delta',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastVisitedAt: '2026-02-01T00:00:00.000Z',
        visitCount: 30,
        pinned: false,
      }),
      createBookmark({
        id: 'b-recent',
        title: 'Zeta',
        createdAt: '2026-03-01T00:00:00.000Z',
        lastVisitedAt: '2026-06-01T00:00:00.000Z',
        visitCount: 5,
        pinned: false,
      }),
      createBookmark({
        id: 'b-mid',
        title: 'Alpha',
        createdAt: '2026-04-01T00:00:00.000Z',
        lastVisitedAt: '2026-05-01T00:00:00.000Z',
        visitCount: 10,
        pinned: false,
      }),
      createBookmark({
        id: 'b-never',
        title: 'Beta',
        createdAt: '2026-02-01T00:00:00.000Z',
        lastVisitedAt: null,
        visitCount: 0,
        pinned: false,
      }),
    ];

    expect(ids(sortBookmarks(bookmarks, sortKey))).toEqual(expected);
    // 不修改原数组
    expect(ids(bookmarks)).toEqual(['b-old', 'b-recent', 'b-mid', 'b-never']);
  });

  // REQ-009-AC-002：任意排序下 pinned 组在前，组内保持所选排序。
  test('sortBookmarks 将 pinned 置于普通书签之前并在组内保持排序', async () => {
    const { sortBookmarks } = await loadQuery();
    expect(sortBookmarks).toBeTypeOf('function');
    if (!sortBookmarks) throw new Error('sortBookmarks is required');

    const bookmarks = [
      createBookmark({ id: 'n-b', title: 'B', visitCount: 2, pinned: false }),
      createBookmark({ id: 'p-a', title: 'A', visitCount: 1, pinned: true }),
      createBookmark({ id: 'n-a', title: 'A', visitCount: 9, pinned: false }),
      createBookmark({ id: 'p-b', title: 'B', visitCount: 8, pinned: true }),
    ];

    expect(ids(sortBookmarks(bookmarks, 'title'))).toEqual(['p-a', 'p-b', 'n-a', 'n-b']);
    expect(ids(sortBookmarks(bookmarks, 'visits'))).toEqual(['p-b', 'p-a', 'n-a', 'n-b']);
  });

  // REQ-008-AC-004 / REQ-009-AC-003：交集筛选。
  test('filterBookmarks 按星标、标签、时间与阅读状态取交集', async () => {
    const { filterBookmarks } = await loadQuery();
    expect(filterBookmarks).toBeTypeOf('function');
    if (!filterBookmarks) throw new Error('filterBookmarks is required');

    const now = () => new Date('2026-07-18T12:00:00.000Z');
    const bookmarks = [
      createBookmark({
        id: 'keep',
        starred: true,
        tagIds: ['tag-a', 'tag-b'],
        createdAt: '2026-07-10T00:00:00.000Z',
        readStatus: 'reading',
      }),
      createBookmark({
        id: 'no-star',
        starred: false,
        tagIds: ['tag-a', 'tag-b'],
        createdAt: '2026-07-10T00:00:00.000Z',
        readStatus: 'reading',
      }),
      createBookmark({
        id: 'missing-tag',
        starred: true,
        tagIds: ['tag-a'],
        createdAt: '2026-07-10T00:00:00.000Z',
        readStatus: 'reading',
      }),
      createBookmark({
        id: 'too-old',
        starred: true,
        tagIds: ['tag-a', 'tag-b'],
        createdAt: '2026-01-01T00:00:00.000Z',
        readStatus: 'reading',
      }),
      createBookmark({
        id: 'wrong-status',
        starred: true,
        tagIds: ['tag-a', 'tag-b'],
        createdAt: '2026-07-10T00:00:00.000Z',
        readStatus: 'unread',
      }),
    ];

    const filtered = filterBookmarks(
      bookmarks,
      {
        onlyStarred: true,
        tagIds: ['tag-a', 'tag-b'],
        dateRange: '30d',
        readStatus: 'reading',
      },
      { now }
    );

    expect(ids(filtered)).toEqual(['keep']);
    expect(filtered.every((b) => b.starred)).toBe(true);
    expect(filtered.every((b) => b.readStatus === 'reading')).toBe(true);
  });

  // REQ-009-AC-004：清除筛选后恢复范围内完整结果。
  test('clearBookmarkFilters 后 queryBookmarks 返回完整范围结果集', async () => {
    const { clearBookmarkFilters, emptyBookmarkFilters, queryBookmarks } = await loadQuery();
    expect(clearBookmarkFilters).toBeTypeOf('function');
    expect(queryBookmarks).toBeTypeOf('function');
    if (!clearBookmarkFilters || !queryBookmarks) {
      throw new Error('clearBookmarkFilters and queryBookmarks are required');
    }

    const scoped = [
      createBookmark({ id: 'a', title: 'A', starred: true, pinned: false }),
      createBookmark({ id: 'b', title: 'B', starred: false, pinned: true }),
      createBookmark({ id: 'c', title: 'C', starred: true, pinned: false }),
    ];

    const cleared = clearBookmarkFilters();
    expect(cleared).toEqual(emptyBookmarkFilters);
    expect(cleared.onlyStarred).toBe(false);
    expect(cleared.tagIds).toEqual([]);
    expect(cleared.dateRange).toBe('all');
    expect(cleared.readStatus).toBe('all');

    const result = queryBookmarks(scoped, {
      filters: cleared,
      sortKey: 'title',
    });
    expect(ids(result)).toEqual(['b', 'a', 'c']); // pinned b first, then title A/C
  });
});
