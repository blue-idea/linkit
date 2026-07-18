import { DOMAIN_CONFIG } from '../../config/domain';
import type { LibraryData } from '../library';
import type { CommandResult } from '../commands/types';

export type TagColor = LibraryData['tags'][number]['color'];

export interface CreateTagInput {
  label: string;
  color?: TagColor;
  idFactory?: () => string;
}

function normalizeLabel(label: string): string {
  return label.trim();
}

function labelKey(label: string): string {
  return normalizeLabel(label).toLocaleLowerCase();
}

function defaultIdFactory(): string {
  return `tag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function findBookmarkIndex(library: LibraryData, bookmarkId: string): number {
  return library.bookmarks.findIndex((bookmark) => bookmark.id === bookmarkId);
}

function findTagIndex(library: LibraryData, tagId: string): number {
  return library.tags.findIndex((tag) => tag.id === tagId);
}

/**
 * 创建标签；库内按规范化 label 唯一。
 * REQ-014 / DATA-INV-003
 */
export function createTag(
  library: LibraryData,
  input: CreateTagInput
): CommandResult<LibraryData> {
  const label = normalizeLabel(input.label);
  if (!label) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.tagLabelInvalid } };
  }

  const key = labelKey(label);
  if (library.tags.some((tag) => labelKey(tag.label) === key)) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.tagLabelDuplicate } };
  }

  const id = (input.idFactory ?? defaultIdFactory)();
  const tag = {
    id,
    label,
    color: input.color ?? 'gray',
  };

  return {
    ok: true,
    value: { ...library, tags: [...library.tags, tag] },
    events: [{ type: DOMAIN_CONFIG.events.tagCreated, payload: { tagId: id } }],
  };
}

/**
 * 删除标签并清理全部书签引用。
 * DATA.md §3.2
 */
export function deleteTag(
  library: LibraryData,
  input: { id: string }
): CommandResult<LibraryData> {
  if (findTagIndex(library, input.id) < 0) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.tagNotFound } };
  }

  return {
    ok: true,
    value: {
      ...library,
      tags: library.tags.filter((tag) => tag.id !== input.id),
      bookmarks: library.bookmarks.map((bookmark) => ({
        ...bookmark,
        tagIds: bookmark.tagIds.filter((tagId) => tagId !== input.id),
        aiSuggestedTags: bookmark.aiSuggestedTags.filter((tagId) => tagId !== input.id),
      })),
    },
    events: [{ type: DOMAIN_CONFIG.events.tagDeleted, payload: { tagId: input.id } }],
  };
}

/**
 * 为书签添加标签；已存在则保持幂等。
 * REQ-014-AC-002
 */
export function addTagToBookmark(
  library: LibraryData,
  input: { bookmarkId: string; tagId: string }
): CommandResult<LibraryData> {
  const bookmarkIndex = findBookmarkIndex(library, input.bookmarkId);
  if (bookmarkIndex < 0) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarkNotFound } };
  }
  if (findTagIndex(library, input.tagId) < 0) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.tagNotFound } };
  }

  const bookmark = library.bookmarks[bookmarkIndex];
  if (bookmark.tagIds.includes(input.tagId)) {
    return { ok: true, value: library, events: [] };
  }

  const bookmarks = [...library.bookmarks];
  bookmarks[bookmarkIndex] = {
    ...bookmark,
    tagIds: [...bookmark.tagIds, input.tagId],
  };

  return {
    ok: true,
    value: { ...library, bookmarks },
    events: [
      {
        type: DOMAIN_CONFIG.events.bookmarkTagChanged,
        payload: { bookmarkId: input.bookmarkId, tagId: input.tagId, member: true },
      },
    ],
  };
}

/**
 * 从书签移除标签。
 * REQ-014-AC-002
 */
export function removeTagFromBookmark(
  library: LibraryData,
  input: { bookmarkId: string; tagId: string }
): CommandResult<LibraryData> {
  const bookmarkIndex = findBookmarkIndex(library, input.bookmarkId);
  if (bookmarkIndex < 0) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarkNotFound } };
  }

  const bookmark = library.bookmarks[bookmarkIndex];
  if (!bookmark.tagIds.includes(input.tagId)) {
    return { ok: true, value: library, events: [] };
  }

  const bookmarks = [...library.bookmarks];
  bookmarks[bookmarkIndex] = {
    ...bookmark,
    tagIds: bookmark.tagIds.filter((tagId) => tagId !== input.tagId),
  };

  return {
    ok: true,
    value: { ...library, bookmarks },
    events: [
      {
        type: DOMAIN_CONFIG.events.bookmarkTagChanged,
        payload: { bookmarkId: input.bookmarkId, tagId: input.tagId, member: false },
      },
    ],
  };
}

/**
 * 采纳 AI 建议标签：加入恰好一次，并从建议列表移除。
 * REQ-014-AC-003
 */
export function acceptSuggestedTag(
  library: LibraryData,
  input: { bookmarkId: string; tagId: string }
): CommandResult<LibraryData> {
  const added = addTagToBookmark(library, input);
  if (!added.ok) return added;

  const bookmarkIndex = findBookmarkIndex(added.value, input.bookmarkId);
  if (bookmarkIndex < 0) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarkNotFound } };
  }

  const bookmark = added.value.bookmarks[bookmarkIndex];
  const bookmarks = [...added.value.bookmarks];
  bookmarks[bookmarkIndex] = {
    ...bookmark,
    aiSuggestedTags: bookmark.aiSuggestedTags.filter((tagId) => tagId !== input.tagId),
  };

  return {
    ok: true,
    value: { ...added.value, bookmarks },
    events: [
      ...added.events,
      {
        type: DOMAIN_CONFIG.events.bookmarkSuggestedTagAccepted,
        payload: { bookmarkId: input.bookmarkId, tagId: input.tagId },
      },
    ],
  };
}

/**
 * 统计包含指定标签的书签数量。
 * REQ-014-AC-001
 */
export function countBookmarksByTag(
  bookmarks: LibraryData['bookmarks'],
  tagId: string
): number {
  return bookmarks.filter((bookmark) => bookmark.tagIds.includes(tagId)).length;
}
