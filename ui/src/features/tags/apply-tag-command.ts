import {
  acceptSuggestedTag as acceptSuggestedTagCommand,
  addTagToBookmark as addTagToBookmarkCommand,
  createTag as createTagCommand,
  deleteTag as deleteTagCommand,
  removeTagFromBookmark as removeTagFromBookmarkCommand,
} from '../../domain/tags';
import type { LibraryData } from '../../domain/library';
import type { Bookmark, Category, Collection, Tag, TagColor } from '../../types';
import { toCategoryLibrary } from '../categories/apply-category-command';

type LibraryEntities = {
  bookmarks: Bookmark[];
  categories: Category[];
  collections: Collection[];
  tags: Tag[];
};

/**
 * 将领域结果投影回 UI 书签与标签。
 * REQ-014
 */
export function applyTagLibraryResult(
  result: Pick<LibraryData, 'tags' | 'bookmarks'>,
  currentBookmarks: Bookmark[]
): { bookmarks: Bookmark[]; tags: Tag[] } {
  const bookmarkById = new Map(
    result.bookmarks.map((bookmark) => [bookmark.id, bookmark])
  );

  return {
    tags: result.tags.map((tag) => ({
      id: tag.id,
      label: tag.label,
      color: tag.color as TagColor,
    })),
    bookmarks: currentBookmarks
      .filter((bookmark) => bookmarkById.has(bookmark.id))
      .map((bookmark) => {
        const next = bookmarkById.get(bookmark.id)!;
        return {
          ...bookmark,
          tags: [...next.tagIds],
          aiSuggestedTags: [...next.aiSuggestedTags],
        };
      }),
  };
}

export function runCreateTag(
  input: LibraryEntities & { label: string; color?: TagColor }
) {
  return createTagCommand(toCategoryLibrary(input), {
    label: input.label,
    color: input.color,
  });
}

export function runDeleteTag(input: LibraryEntities & { id: string }) {
  return deleteTagCommand(toCategoryLibrary(input), { id: input.id });
}

export function runAddTagToBookmark(
  input: LibraryEntities & { bookmarkId: string; tagId: string }
) {
  return addTagToBookmarkCommand(toCategoryLibrary(input), {
    bookmarkId: input.bookmarkId,
    tagId: input.tagId,
  });
}

export function runRemoveTagFromBookmark(
  input: LibraryEntities & { bookmarkId: string; tagId: string }
) {
  return removeTagFromBookmarkCommand(toCategoryLibrary(input), {
    bookmarkId: input.bookmarkId,
    tagId: input.tagId,
  });
}

export function runAcceptSuggestedTag(
  input: LibraryEntities & { bookmarkId: string; tagId: string }
) {
  return acceptSuggestedTagCommand(toCategoryLibrary(input), {
    bookmarkId: input.bookmarkId,
    tagId: input.tagId,
  });
}

/**
 * UI 侧栏标签计数。
 * REQ-014-AC-001
 */
export function countBookmarksWithTag(bookmarks: Bookmark[], tagId: string): number {
  return bookmarks.filter((bookmark) => bookmark.tags.includes(tagId)).length;
}

/**
 * 按标签筛选可见书签。
 * REQ-014-AC-001
 */
export function filterBookmarksByTag(bookmarks: Bookmark[], tagId: string): Bookmark[] {
  return bookmarks.filter((bookmark) => bookmark.tags.includes(tagId));
}
