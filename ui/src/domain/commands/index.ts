import { DOMAIN_CONFIG } from '../../config/domain';
import type { LibraryData } from '../library';
import type { CommandResult } from './types';

export type { CommandResult, DomainError, DomainEvent, LibraryCommand } from './types';
export {
  createBookmark,
  deleteBookmark,
  normalizeBookmarkUrl,
  updateBookmark,
} from './bookmarks';
export type {
  CreateBookmarkInput,
  DeleteBookmarkInput,
  UpdateBookmarkInput,
} from './bookmarks';

export interface MembershipCommandInput extends Record<string, unknown> {
  bookmarkId: string;
  collectionId: string;
  member: boolean;
}

function updateMembership(ids: string[], id: string, member: boolean): string[] {
  if (member) return ids.includes(id) ? [...ids] : [...ids, id];
  return ids.filter((currentId) => currentId !== id);
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
