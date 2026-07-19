import type { Bookmark, LibraryData } from '../../domain/library';
import type { CommandResult } from '../../domain/commands';
import { normalizeBookmarkUrl } from '../../domain/commands';
import type { Bookmark as UiBookmark, Collection as UiCollection } from '../../types';

type EditorInput = {
  bookmarkId: string;
  url: string;
  title: string;
  description: string;
  notes: string;
  categoryId: string | null;
  tagIds: string[];
  collectionIds: string[];
  readStatus: Bookmark['readStatus'];
};

function error(code: string, message: string): CommandResult<LibraryData> {
  return { ok: false, error: { code, message } };
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

/** REQ-007-AC-008：按当前视图顺序计算包含两端的 Shift 选择范围。 */
export function selectBookmarkRange(orderedIds: string[], anchorId: string, currentId: string): string[] {
  const anchorIndex = orderedIds.indexOf(anchorId);
  const currentIndex = orderedIds.indexOf(currentId);
  if (anchorIndex < 0 || currentIndex < 0) return [currentId];
  const start = Math.min(anchorIndex, currentIndex);
  const end = Math.max(anchorIndex, currentIndex);
  return orderedIds.slice(start, end + 1);
}

/** REQ-007-AC-007：统一编辑保存前完成全部引用和 URL 校验。 */
export function updateBookmarkFromEditor(library: LibraryData, input: EditorInput): CommandResult<LibraryData> {
  const bookmark = library.bookmarks.find(({ id }) => id === input.bookmarkId);
  if (!bookmark) return error('BOOKMARK_NOT_FOUND', 'Bookmark was not found');
  const normalized = normalizeBookmarkUrl(input.url);
  if (!normalized.ok || !input.title.trim()) return error('BOOKMARK_INVALID', 'Bookmark URL and title are required');
  if (input.categoryId !== null && !library.categories.some(({ id }) => id === input.categoryId)) {
    return error('CATEGORY_NOT_FOUND', 'Category was not found');
  }
  const tagIds = unique(input.tagIds);
  const collectionIds = unique(input.collectionIds);
  if (tagIds.some((id) => !library.tags.some((tag) => tag.id === id))) return error('TAG_NOT_FOUND', 'Tag was not found');
  if (collectionIds.some((id) => !library.collections.some((collection) => collection.id === id))) {
    return error('COLLECTION_NOT_FOUND', 'Collection was not found');
  }
  const updatedAt = new Date().toISOString();
  return {
    ok: true,
    value: {
      ...library,
      bookmarks: library.bookmarks.map((current) => current.id === bookmark.id ? {
        ...current, url: normalized.url, domain: normalized.domain, title: input.title.trim(),
        description: input.description, notes: input.notes, categoryId: input.categoryId,
        tagIds, collectionIds, readStatus: input.readStatus, updatedAt,
      } : current),
      collections: library.collections.map((collection) => ({
        ...collection,
        bookmarkIds: collectionIds.includes(collection.id)
          ? unique([...collection.bookmarkIds, bookmark.id])
          : collection.bookmarkIds.filter((id) => id !== bookmark.id),
      })),
    },
    events: [{ type: 'bookmark.edited', payload: { bookmarkId: bookmark.id } }],
  };
}

function validateSelection(library: LibraryData, bookmarkIds: string[]): string[] | null {
  const ids = unique(bookmarkIds);
  if (ids.length === 0 || ids.some((id) => !library.bookmarks.some((bookmark) => bookmark.id === id))) return null;
  return ids;
}

/** REQ-011-AC-005：先校验整批，再一次性移动，禁止部分成功。 */
export function batchMoveBookmarks(library: LibraryData, input: { bookmarkIds: string[]; categoryId: string | null }): CommandResult<LibraryData> {
  const ids = validateSelection(library, input.bookmarkIds);
  if (!ids) return error('BOOKMARK_NOT_FOUND', 'One or more bookmarks were not found');
  if (input.categoryId !== null && !library.categories.some(({ id }) => id === input.categoryId)) {
    return error('CATEGORY_NOT_FOUND', 'Category was not found');
  }
  const selected = new Set(ids);
  return {
    ok: true,
    value: { ...library, bookmarks: library.bookmarks.map((bookmark) => selected.has(bookmark.id) ? { ...bookmark, categoryId: input.categoryId, updatedAt: new Date().toISOString() } : bookmark) },
    events: [{ type: 'bookmark.batch-moved', payload: { bookmarkIds: ids, categoryId: input.categoryId } }],
  };
}

/** REQ-007-AC-009：原子删除整批书签并清理所有主题引用。 */
export function batchDeleteBookmarks(library: LibraryData, input: { bookmarkIds: string[] }): CommandResult<LibraryData> {
  const ids = validateSelection(library, input.bookmarkIds);
  if (!ids) return error('BOOKMARK_NOT_FOUND', 'One or more bookmarks were not found');
  const selected = new Set(ids);
  return {
    ok: true,
    value: {
      ...library,
      bookmarks: library.bookmarks.filter(({ id }) => !selected.has(id)),
      collections: library.collections.map((collection) => ({ ...collection, bookmarkIds: collection.bookmarkIds.filter((id) => !selected.has(id)) })),
    },
    events: [{ type: 'bookmark.batch-deleted', payload: { bookmarkIds: ids } }],
  };
}

/** 将领域命令结果完整投影回现有 UI 模型。 */
export function applyBookmarkActionResult(result: LibraryData, current: UiBookmark[], collections: UiCollection[]) {
  const previous = new Map(current.map((bookmark) => [bookmark.id, bookmark]));
  return {
    bookmarks: result.bookmarks.map((bookmark): UiBookmark => ({
      ...previous.get(bookmark.id)!,
      id: bookmark.id, title: bookmark.title, url: bookmark.url, domain: bookmark.domain,
      description: bookmark.description, notes: bookmark.notes, tags: [...bookmark.tagIds],
      categoryId: bookmark.categoryId ?? '', collectionIds: [...bookmark.collectionIds],
      readStatus: bookmark.readStatus,
    })),
    collections: collections.map((collection) => ({
      ...collection,
      bookmarkIds: result.collections.find(({ id }) => id === collection.id)?.bookmarkIds ?? [],
    })),
  };
}
