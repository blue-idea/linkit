import {
  createCollection as createCollectionCommand,
  deleteCollection as deleteCollectionCommand,
  updateCollection as updateCollectionCommand,
} from '../../domain/collections';
import {
  batchSetBookmarkCollectionMembership,
  setBookmarkCollectionMembership,
} from '../../domain/commands';
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
 * 将领域 LibraryData 投影回 UI 书签与主题。
 * REQ-012 / REQ-026-AC-003
 */
export function applyCollectionLibraryResult(
  result: Pick<LibraryData, 'collections' | 'bookmarks'>,
  currentBookmarks: Bookmark[]
): { bookmarks: Bookmark[]; collections: Collection[] } {
  const bookmarkMembership = new Map(
    result.bookmarks.map((bookmark) => [bookmark.id, bookmark.collectionIds])
  );

  return {
    collections: result.collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      emoji: collection.emoji,
      color: collection.color as TagColor,
      description: collection.description,
      bookmarkIds: [...collection.bookmarkIds],
    })),
    bookmarks: currentBookmarks
      .filter((bookmark) => bookmarkMembership.has(bookmark.id))
      .map((bookmark) => ({
        ...bookmark,
        collectionIds: [...(bookmarkMembership.get(bookmark.id) ?? [])],
      })),
  };
}

export function runCreateCollection(
  input: LibraryEntities & {
    name: string;
    emoji?: string;
    color?: TagColor;
    description?: string;
  }
) {
  return createCollectionCommand(toCategoryLibrary(input), {
    name: input.name,
    emoji: input.emoji,
    color: input.color,
    description: input.description,
  });
}

export function runUpdateCollection(
  input: LibraryEntities & {
    id: string;
    name?: string;
    emoji?: string;
    color?: TagColor;
    description?: string;
  }
) {
  return updateCollectionCommand(toCategoryLibrary(input), {
    id: input.id,
    name: input.name,
    emoji: input.emoji,
    color: input.color,
    description: input.description,
  });
}

export function runDeleteCollection(input: LibraryEntities & { id: string }) {
  return deleteCollectionCommand(toCategoryLibrary(input), { id: input.id });
}

/**
 * 通过领域命令同步主题成员双向关系。
 * REQ-012-AC-003 / REQ-026-AC-003
 */
export function runSetMembership(
  input: LibraryEntities & {
    bookmarkId: string;
    collectionId: string;
    member: boolean;
  }
) {
  return setBookmarkCollectionMembership(toCategoryLibrary(input), {
    bookmarkId: input.bookmarkId,
    collectionId: input.collectionId,
    member: input.member,
  });
}

/**
 * 批量加入或移出主题成员（单一 LibraryData 结果）。
 * REQ-012-AC-008 / REQ-012-AC-011 / REQ-026-AC-003
 */
export function runBatchSetMembership(
  input: LibraryEntities & {
    bookmarkIds: string[];
    collectionId: string;
    member: boolean;
  }
) {
  return batchSetBookmarkCollectionMembership(toCategoryLibrary(input), {
    bookmarkIds: input.bookmarkIds,
    collectionId: input.collectionId,
    member: input.member,
  });
}
