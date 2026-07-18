import { DOMAIN_CONFIG } from '../../config/domain';
import type { LibraryData } from '../library';
import type { CommandResult } from '../commands/types';

export type CollectionColor = LibraryData['collections'][number]['color'];

export interface CreateCollectionInput {
  name: string;
  emoji?: string;
  color?: CollectionColor;
  description?: string;
  idFactory?: () => string;
  now?: () => string;
}

export interface UpdateCollectionInput {
  id: string;
  name?: string;
  emoji?: string;
  color?: CollectionColor;
  description?: string;
  now?: () => string;
}

export interface DeleteCollectionInput {
  id: string;
}

function normalizeName(name: string): string {
  return name.trim();
}

function normalizeEmoji(emoji: string | undefined): string {
  const value = (emoji ?? '📚').trim();
  return value || '📚';
}

function defaultIdFactory(): string {
  return `collection-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultNow(): string {
  return new Date().toISOString();
}

/**
 * 创建主题；名称非空，默认空成员列表。
 * REQ-012-AC-001
 */
export function createCollection(
  library: LibraryData,
  input: CreateCollectionInput
): CommandResult<LibraryData> {
  const name = normalizeName(input.name);
  if (!name) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.collectionNameInvalid } };
  }

  const emoji = normalizeEmoji(input.emoji);
  if (!emoji) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.collectionEmojiInvalid } };
  }

  const id = (input.idFactory ?? defaultIdFactory)();
  const timestamp = (input.now ?? defaultNow)();
  const collection = {
    id,
    name,
    emoji,
    color: input.color ?? 'gray',
    description: input.description ?? '',
    bookmarkIds: [] as string[],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    ok: true,
    value: {
      ...library,
      collections: [...library.collections, collection],
    },
    events: [
      {
        type: DOMAIN_CONFIG.events.collectionCreated,
        payload: { collectionId: id },
      },
    ],
  };
}

/**
 * 更新主题元数据并刷新 updatedAt。
 * REQ-012-AC-001
 */
export function updateCollection(
  library: LibraryData,
  input: UpdateCollectionInput
): CommandResult<LibraryData> {
  const index = library.collections.findIndex((collection) => collection.id === input.id);
  if (index < 0) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.collectionNotFound } };
  }

  const current = library.collections[index];
  let name = current.name;
  if (input.name !== undefined) {
    name = normalizeName(input.name);
    if (!name) {
      return { ok: false, error: { ...DOMAIN_CONFIG.errors.collectionNameInvalid } };
    }
  }

  let emoji = current.emoji;
  if (input.emoji !== undefined) {
    emoji = normalizeEmoji(input.emoji);
    if (!emoji) {
      return { ok: false, error: { ...DOMAIN_CONFIG.errors.collectionEmojiInvalid } };
    }
  }

  const collections = [...library.collections];
  collections[index] = {
    ...current,
    name,
    emoji,
    color: input.color ?? current.color,
    description: input.description ?? current.description,
    updatedAt: (input.now ?? defaultNow)(),
  };

  return {
    ok: true,
    value: { ...library, collections },
    events: [
      {
        type: DOMAIN_CONFIG.events.collectionUpdated,
        payload: { collectionId: input.id },
      },
    ],
  };
}

/**
 * 删除主题但保留成员书签，并清理两侧引用。
 * REQ-012-AC-002 / REQ-026-AC-003
 */
export function deleteCollection(
  library: LibraryData,
  input: DeleteCollectionInput
): CommandResult<LibraryData> {
  if (!library.collections.some((collection) => collection.id === input.id)) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.collectionNotFound } };
  }

  return {
    ok: true,
    value: {
      ...library,
      collections: library.collections.filter((collection) => collection.id !== input.id),
      bookmarks: library.bookmarks.map((bookmark) => ({
        ...bookmark,
        collectionIds: bookmark.collectionIds.filter((id) => id !== input.id),
      })),
    },
    events: [
      {
        type: DOMAIN_CONFIG.events.collectionDeleted,
        payload: { collectionId: input.id },
      },
    ],
  };
}

/**
 * 按主题 bookmarkIds 返回当前成员（保持顺序）。
 * REQ-012-AC-004
 */
export function listCollectionMembers(
  library: LibraryData,
  collectionId: string
): LibraryData['bookmarks'] | null {
  const collection = library.collections.find((item) => item.id === collectionId);
  if (!collection) return null;

  const byId = new Map(library.bookmarks.map((bookmark) => [bookmark.id, bookmark]));
  return collection.bookmarkIds
    .map((id) => byId.get(id))
    .filter((bookmark): bookmark is LibraryData['bookmarks'][number] => Boolean(bookmark));
}
