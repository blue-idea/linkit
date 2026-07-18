import { QUERY_CONFIG } from '../../config/query';
import type { ReadStatus } from '../commands/bookmark-state';

export type SortKey = (typeof QUERY_CONFIG.sortKeys)[number];
export type DateRangeFilter = (typeof QUERY_CONFIG.dateRanges)[number];

/** 排序所需最小字段；领域与 UI 书签均可满足。 */
export interface SortableBookmark {
  id: string;
  title: string;
  createdAt: string;
  lastVisitedAt: string | null;
  visitCount: number;
  pinned: boolean;
}

/** 筛选所需最小字段。 */
export interface FilterableBookmark extends SortableBookmark {
  starred: boolean;
  tagIds: string[];
  readStatus: ReadStatus;
}

export interface BookmarkQueryFilters {
  onlyStarred: boolean;
  tagIds: string[];
  dateRange: DateRangeFilter;
  readStatus: 'all' | ReadStatus;
}

export const emptyBookmarkFilters: BookmarkQueryFilters = {
  onlyStarred: QUERY_CONFIG.emptyFilters.onlyStarred,
  tagIds: [...QUERY_CONFIG.emptyFilters.tagIds],
  dateRange: QUERY_CONFIG.emptyFilters.dateRange,
  readStatus: QUERY_CONFIG.emptyFilters.readStatus,
};

/**
 * 清除全部活动筛选，恢复默认空筛选。
 * REQ-009-AC-004
 */
export function clearBookmarkFilters(): BookmarkQueryFilters {
  return {
    onlyStarred: emptyBookmarkFilters.onlyStarred,
    tagIds: [...emptyBookmarkFilters.tagIds],
    dateRange: emptyBookmarkFilters.dateRange,
    readStatus: emptyBookmarkFilters.readStatus,
  };
}

function compareBySortKey(a: SortableBookmark, b: SortableBookmark, sortKey: SortKey): number {
  switch (sortKey) {
    case 'created':
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    case 'visits':
      return b.visitCount - a.visitCount;
    case 'title': {
      const byTitle = a.title.localeCompare(b.title);
      return byTitle !== 0 ? byTitle : a.id.localeCompare(b.id);
    }
    case 'recent':
    default: {
      // 空 lastVisitedAt 沉底，保证从未访问项顺序稳定。
      const aVisit = a.lastVisitedAt ? Date.parse(a.lastVisitedAt) : Number.NEGATIVE_INFINITY;
      const bVisit = b.lastVisitedAt ? Date.parse(b.lastVisitedAt) : Number.NEGATIVE_INFINITY;
      const byVisit = bVisit - aVisit;
      return byVisit !== 0 ? byVisit : a.id.localeCompare(b.id);
    }
  }
}

/**
 * 排序：pinned 组优先，组内按所选键排序；并列时用 id 保证稳定。
 * REQ-009-AC-001 / REQ-009-AC-002
 */
export function sortBookmarks<T extends SortableBookmark>(bookmarks: T[], sortKey: SortKey): T[] {
  return [...bookmarks].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    const primary = compareBySortKey(a, b, sortKey);
    return primary !== 0 ? primary : a.id.localeCompare(b.id);
  });
}

function matchesDateRange(
  createdAt: string,
  dateRange: DateRangeFilter,
  now: Date
): boolean {
  if (dateRange === 'all') return true;
  const days = QUERY_CONFIG.dateRangeDays[dateRange];
  const cutoff = now.getTime() - days * 86_400_000;
  return Date.parse(createdAt) >= cutoff;
}

/**
 * 组合筛选：星标、标签、时间、阅读状态取交集。
 * REQ-008-AC-004 / REQ-009-AC-003
 */
export function filterBookmarks<T extends FilterableBookmark>(
  bookmarks: T[],
  filters: BookmarkQueryFilters,
  options?: { now?: () => Date }
): T[] {
  const now = (options?.now ?? (() => new Date()))();
  return bookmarks.filter((bookmark) => {
    if (filters.onlyStarred && !bookmark.starred) return false;
    if (
      filters.tagIds.length > 0 &&
      !filters.tagIds.every((tagId) => bookmark.tagIds.includes(tagId))
    ) {
      return false;
    }
    if (!matchesDateRange(bookmark.createdAt, filters.dateRange, now)) return false;
    if (filters.readStatus !== 'all' && bookmark.readStatus !== filters.readStatus) {
      return false;
    }
    return true;
  });
}

/**
 * 先筛选再排序，供列表视图统一调用。
 * REQ-009-AC-001~004
 */
export function queryBookmarks<T extends FilterableBookmark>(
  bookmarks: T[],
  input: {
    filters: BookmarkQueryFilters;
    sortKey: SortKey;
    now?: () => Date;
  }
): T[] {
  const filtered = filterBookmarks(bookmarks, input.filters, { now: input.now });
  return sortBookmarks(filtered, input.sortKey);
}
