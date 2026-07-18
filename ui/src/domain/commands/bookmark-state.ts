import { DOMAIN_CONFIG } from '../../config/domain';
import type { Bookmark, LibraryData } from '../library';
import type { CommandResult } from './types';

export type ReadStatus = 'unread' | 'reading' | 'read' | 'archived';

const READ_STATUSES: readonly ReadStatus[] = ['unread', 'reading', 'read', 'archived'];

export interface BookmarkIdInput {
  id: string;
  now?: () => Date;
}

export interface SetReadStatusInput extends BookmarkIdInput {
  readStatus: ReadStatus;
}

function isReadStatus(value: string): value is ReadStatus {
  return (READ_STATUSES as readonly string[]).includes(value);
}

function mapBookmark(
  library: LibraryData,
  id: string,
  now: () => Date,
  patch: (bookmark: Bookmark) => Bookmark,
  eventType: string
): CommandResult<LibraryData> {
  const index = library.bookmarks.findIndex((bookmark) => bookmark.id === id);
  if (index < 0) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarkNotFound } };
  }

  const current = library.bookmarks[index];
  const next = {
    ...patch(current),
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: now().toISOString(),
  };
  const bookmarks = [...library.bookmarks];
  bookmarks[index] = next;

  return {
    ok: true,
    value: { ...library, bookmarks },
    events: [{ type: eventType, payload: { bookmarkId: id } }],
  };
}

/**
 * 切换书签星标状态。
 * REQ-008-AC-001
 */
export function toggleBookmarkStarred(
  library: LibraryData,
  input: BookmarkIdInput
): CommandResult<LibraryData> {
  return mapBookmark(
    library,
    input.id,
    input.now ?? (() => new Date()),
    (bookmark) => ({ ...bookmark, starred: !bookmark.starred }),
    DOMAIN_CONFIG.events.bookmarkStarredToggled
  );
}

/**
 * 切换书签置顶状态。
 * REQ-008-AC-001
 */
export function toggleBookmarkPinned(
  library: LibraryData,
  input: BookmarkIdInput
): CommandResult<LibraryData> {
  return mapBookmark(
    library,
    input.id,
    input.now ?? (() => new Date()),
    (bookmark) => ({ ...bookmark, pinned: !bookmark.pinned }),
    DOMAIN_CONFIG.events.bookmarkPinnedToggled
  );
}

/**
 * 将阅读状态更新为且仅为合法枚举值。
 * REQ-008-AC-003
 */
export function setBookmarkReadStatus(
  library: LibraryData,
  input: SetReadStatusInput
): CommandResult<LibraryData> {
  if (!isReadStatus(input.readStatus)) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.readStatusInvalid } };
  }

  return mapBookmark(
    library,
    input.id,
    input.now ?? (() => new Date()),
    (bookmark) => ({ ...bookmark, readStatus: input.readStatus }),
    DOMAIN_CONFIG.events.bookmarkReadStatusChanged
  );
}

/**
 * 在外部 URL 打开成功后记录一次访问。
 * REQ-008-AC-002
 */
export function recordBookmarkVisit(
  library: LibraryData,
  input: BookmarkIdInput
): CommandResult<LibraryData> {
  // 固定同一时刻，保证 lastVisitedAt 与 updatedAt 一致。
  const visitedAt = (input.now ?? (() => new Date()))().toISOString();
  return mapBookmark(
    library,
    input.id,
    () => new Date(visitedAt),
    (bookmark) => ({
      ...bookmark,
      visitCount: bookmark.visitCount + 1,
      lastVisitedAt: visitedAt,
    }),
    DOMAIN_CONFIG.events.bookmarkVisited
  );
}

/**
 * 按阅读状态筛选；仅返回完全匹配的书签。
 * REQ-008-AC-004
 */
export function filterBookmarksByReadStatus(
  bookmarks: LibraryData['bookmarks'],
  readStatus: ReadStatus
): LibraryData['bookmarks'] {
  return bookmarks.filter((bookmark) => bookmark.readStatus === readStatus);
}
