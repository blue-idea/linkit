import { DOMAIN_CONFIG } from '../../../config/domain';
import type { LibraryData } from '../../../domain/library';
import type { CommandResult } from '../../../domain/commands/types';

export interface DuplicateDifference { field: string; target: string; duplicate: string }
export interface DuplicatePreview { targetId: string; duplicateId: string; reason: string; differences: DuplicateDifference[] }

export function buildDuplicatePreview(library: LibraryData, targetId: string, duplicateId: string): DuplicatePreview | null {
  const target = library.bookmarks.find(({ id }) => id === targetId);
  const duplicate = library.bookmarks.find(({ id }) => id === duplicateId);
  if (!target || !duplicate) return null;
  const fields: Array<keyof Pick<typeof target, 'title' | 'url' | 'description' | 'notes' | 'categoryId'>> =
    ['title', 'url', 'description', 'notes', 'categoryId'];
  return {
    targetId, duplicateId,
    reason: target.url.replace(/\/$/, '') === duplicate.url.replace(/\/$/, '') ? 'Exact URL match' : `Same domain: ${target.domain}`,
    differences: fields.flatMap((field) => target[field] === duplicate[field] ? [] : [{
      field, target: String(target[field] ?? ''), duplicate: String(duplicate[field] ?? ''),
    }]),
  };
}

function removeBookmark(library: LibraryData, id: string): LibraryData {
  return {
    ...library,
    bookmarks: library.bookmarks.filter((bookmark) => bookmark.id !== id),
    collections: library.collections.map((collection) => ({
      ...collection, bookmarkIds: collection.bookmarkIds.filter((bookmarkId) => bookmarkId !== id),
    })),
  };
}

/** 合并保留目标字段，并合并标签、主题关系；删除只处理用户指定的重复项。 */
export function applyDuplicateDecision(
  library: LibraryData,
  input: { targetId: string; duplicateId: string; action: 'merge' | 'delete' | 'cancel' },
): CommandResult<LibraryData> {
  if (input.action === 'cancel') return { ok: true, value: library, events: [] };
  const target = library.bookmarks.find(({ id }) => id === input.targetId);
  const duplicate = library.bookmarks.find(({ id }) => id === input.duplicateId);
  if (!target || !duplicate) return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarkNotFound } };

  if (input.action === 'delete') {
    return { ok: true, value: removeBookmark(library, duplicate.id), events: [{
      type: DOMAIN_CONFIG.events.duplicateDeleted, payload: { bookmarkId: duplicate.id },
    }] };
  }

  const collectionIds = [...new Set([...target.collectionIds, ...duplicate.collectionIds])];
  let value = removeBookmark(library, duplicate.id);
  value = {
    ...value,
    bookmarks: value.bookmarks.map((bookmark) => bookmark.id === target.id ? {
      ...bookmark,
      tagIds: [...new Set([...target.tagIds, ...duplicate.tagIds])],
      collectionIds,
    } : bookmark),
    collections: value.collections.map((collection) => collectionIds.includes(collection.id) ? {
      ...collection,
      bookmarkIds: [...new Set([...collection.bookmarkIds, target.id])],
    } : collection),
  };
  return { ok: true, value, events: [{
    type: DOMAIN_CONFIG.events.duplicateMerged,
    payload: { targetId: target.id, duplicateId: duplicate.id },
  }] };
}
