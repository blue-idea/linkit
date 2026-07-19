import { DOMAIN_CONFIG } from '../../config/domain';
import type { LibraryData } from '../library';
import type { CommandResult } from './types';

export type { CommandResult, DomainError, DomainEvent, LibraryCommand } from './types';
export {
  createBookmark,
  deleteBookmark,
  isBookmarkUrlDuplicate,
  normalizeBookmarkUrl,
  updateBookmark,
} from './bookmarks';
export type {
  CreateBookmarkInput,
  DeleteBookmarkInput,
  UpdateBookmarkInput,
} from './bookmarks';
export {
  filterBookmarksByReadStatus,
  recordBookmarkVisit,
  setBookmarkReadStatus,
  toggleBookmarkPinned,
  toggleBookmarkStarred,
} from './bookmark-state';
export type {
  BookmarkIdInput,
  ReadStatus,
  SetReadStatusInput,
} from './bookmark-state';

export interface MembershipCommandInput extends Record<string, unknown> {
  bookmarkId: string;
  collectionId: string;
  member: boolean;
}

export interface BatchMembershipCommandInput extends Record<string, unknown> {
  bookmarkIds: string[];
  collectionId: string;
  member: boolean;
}

function updateMembership(ids: string[], id: string, member: boolean): string[] {
  if (member) return ids.includes(id) ? [...ids] : [...ids, id];
  return ids.filter((currentId) => currentId !== id);
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

// REQ-026-AC-002/003：所有主题成员修改必须通过纯命令同步两侧引用。
export function setBookmarkCollectionMembership(
  library: LibraryData,
  input: MembershipCommandInput,
): CommandResult<LibraryData> {
  const bookmarkIndex = library.bookmarks.findIndex(({ id }) => id === input.bookmarkId);
  if (bookmarkIndex < 0) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarkNotFound } };
  }

  const collectionIndex = library.collections.findIndex(({ id }) => id === input.collectionId);
  if (collectionIndex < 0) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.collectionNotFound } };
  }

  const bookmark = library.bookmarks[bookmarkIndex];
  const collection = library.collections[collectionIndex];
  const bookmarks = [...library.bookmarks];
  const collections = [...library.collections];
  bookmarks[bookmarkIndex] = {
    ...bookmark,
    collectionIds: updateMembership(bookmark.collectionIds, collection.id, input.member),
  };
  collections[collectionIndex] = {
    ...collection,
    bookmarkIds: updateMembership(collection.bookmarkIds, bookmark.id, input.member),
  };

  return {
    ok: true,
    value: { ...library, bookmarks, collections },
    events: [{
      type: DOMAIN_CONFIG.events.collectionMembershipChanged,
      payload: { ...input },
    }],
  };
}

/**
 * REQ-012-AC-008/011 / REQ-026-AC-003：
 * 批量加入或移出主题成员；任一无效则整批失败且资料库不变。
 */
export function batchSetBookmarkCollectionMembership(
  library: LibraryData,
  input: BatchMembershipCommandInput,
): CommandResult<LibraryData> {
  const bookmarkIds = uniqueIds(input.bookmarkIds);
  if (
    bookmarkIds.length === 0
    || bookmarkIds.some((id) => !library.bookmarks.some((bookmark) => bookmark.id === id))
  ) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarksNotFound } };
  }

  const collectionIndex = library.collections.findIndex(({ id }) => id === input.collectionId);
  if (collectionIndex < 0) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.collectionNotFound } };
  }

  const selected = new Set(bookmarkIds);
  const collection = library.collections[collectionIndex];
  const bookmarks = library.bookmarks.map((bookmark) => (
    selected.has(bookmark.id)
      ? {
          ...bookmark,
          collectionIds: updateMembership(bookmark.collectionIds, collection.id, input.member),
        }
      : bookmark
  ));

  let nextBookmarkIds = [...collection.bookmarkIds];
  for (const bookmarkId of bookmarkIds) {
    nextBookmarkIds = updateMembership(nextBookmarkIds, bookmarkId, input.member);
  }

  const collections = [...library.collections];
  collections[collectionIndex] = {
    ...collection,
    bookmarkIds: nextBookmarkIds,
  };

  return {
    ok: true,
    value: { ...library, bookmarks, collections },
    events: [{
      type: DOMAIN_CONFIG.events.collectionMembershipBatchChanged,
      payload: {
        bookmarkIds,
        collectionId: input.collectionId,
        member: input.member,
      },
    }],
  };
}
