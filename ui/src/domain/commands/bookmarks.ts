import { DOMAIN_CONFIG } from '../../config/domain';
import type { Bookmark, LibraryData } from '../library';
import type { CommandResult } from './types';

export interface CreateBookmarkInput {
  url: string;
  title?: string;
  description?: string;
  notes?: string;
  tagIds?: string[];
  categoryId?: string | null;
  collectionIds?: string[];
  aiSummary?: string;
  aiSuggestedTags?: string[];
  favicon?: string | null;
  thumbnail?: string | null;
  idFactory?: () => string;
  now?: () => Date;
}

export interface UpdateBookmarkInput {
  id: string;
  patch: Partial<Omit<Bookmark, 'id' | 'createdAt'>>;
  now?: () => Date;
}

export interface DeleteBookmarkInput {
  id: string;
}

/**
 * 规范化 http(s) URL；拒绝危险协议。
 * REQ-006-AC-004
 */
export function normalizeBookmarkUrl(raw: string): { ok: true; url: string; domain: string } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false };
  try {
    const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false };
    }
    return { ok: true, url: parsed.href, domain: parsed.hostname || 'unknown' };
  } catch {
    return { ok: false };
  }
}

function bookmarkUrlKey(url: string): string {
  return url.replace(/\/+$/, '');
}

export function isBookmarkUrlDuplicate(
  bookmarks: ReadonlyArray<{ url: string }>,
  normalizedUrl: string
): boolean {
  const candidate = bookmarkUrlKey(normalizedUrl);
  return bookmarks.some((bookmark) => bookmarkUrlKey(bookmark.url) === candidate);
}

function defaultIdFactory(): string {
  return `bookmark-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function syncCollectionMembership(
  collections: LibraryData['collections'],
  bookmarkId: string,
  collectionIds: string[]
): LibraryData['collections'] {
  const wanted = new Set(collectionIds);
  return collections.map((collection) => {
    const has = collection.bookmarkIds.includes(bookmarkId);
    const shouldHave = wanted.has(collection.id);
    if (has === shouldHave) return collection;
    return {
      ...collection,
      bookmarkIds: shouldHave
        ? [...collection.bookmarkIds, bookmarkId]
        : collection.bookmarkIds.filter((id) => id !== bookmarkId),
      updatedAt: collection.updatedAt,
    };
  });
}

function buildBookmark(
  input: CreateBookmarkInput,
  normalized: { url: string; domain: string },
  id: string,
  nowIso: string
): Bookmark {
  const title = (input.title?.trim() || normalized.domain).trim();
  return {
    id,
    title,
    url: normalized.url,
    domain: normalized.domain,
    favicon: input.favicon ?? null,
    description: input.description ?? '',
    notes: input.notes ?? '',
    tagIds: [...(input.tagIds ?? [])],
    categoryId: input.categoryId ?? null,
    collectionIds: [...(input.collectionIds ?? [])],
    createdAt: nowIso,
    updatedAt: nowIso,
    lastVisitedAt: null,
    visitCount: 0,
    starred: false,
    pinned: false,
    readStatus: 'unread',
    health: 'ok',
    healthCheckedAt: null,
    healthHttpStatus: null,
    healthFingerprint: null,
    healthErrorCode: null,
    aiSummary: input.aiSummary ?? '',
    aiSuggestedTags: [...(input.aiSuggestedTags ?? [])],
    thumbnail: input.thumbnail ?? null,
  };
}

/**
 * 创建书签：规范化 URL、生成唯一 ID、同步主题成员。
 * REQ-006-AC-004
 */
export function createBookmark(
  library: LibraryData,
  input: CreateBookmarkInput
): CommandResult<LibraryData> {
  const normalized = normalizeBookmarkUrl(input.url);
  if (!normalized.ok) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarkUrlInvalid } };
  }
  // REQ-006-AC-005：创建前按规范化 URL 去重，避免同一网页重复入库。
  if (isBookmarkUrlDuplicate(library.bookmarks, normalized.url)) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarkUrlDuplicate } };
  }

  const id = (input.idFactory ?? defaultIdFactory)();
  const nowIso = (input.now ?? (() => new Date()))().toISOString();
  const bookmark = buildBookmark(input, normalized, id, nowIso);
  const collections = syncCollectionMembership(
    library.collections,
    id,
    bookmark.collectionIds
  );

  return {
    ok: true,
    value: {
      ...library,
      bookmarks: [bookmark, ...library.bookmarks],
      collections,
    },
    events: [{ type: DOMAIN_CONFIG.events.bookmarkCreated, payload: { bookmarkId: id } }],
  };
}

/**
 * 更新书签字段并刷新 updatedAt；若变更 collectionIds 则同步两侧引用。
 * REQ-007-AC-002
 */
export function updateBookmark(
  library: LibraryData,
  input: UpdateBookmarkInput
): CommandResult<LibraryData> {
  const index = library.bookmarks.findIndex((b) => b.id === input.id);
  if (index < 0) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarkNotFound } };
  }

  const current = library.bookmarks[index];
  const nowIso = (input.now ?? (() => new Date()))().toISOString();
  const patch = { ...input.patch } as Partial<Bookmark>;
  delete patch.id;
  delete patch.createdAt;
  const next: Bookmark = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: nowIso,
    tagIds: patch.tagIds ? [...patch.tagIds] : current.tagIds,
    collectionIds: patch.collectionIds ? [...patch.collectionIds] : current.collectionIds,
    aiSuggestedTags: patch.aiSuggestedTags
      ? [...patch.aiSuggestedTags]
      : current.aiSuggestedTags,
  };

  if (patch.url !== undefined) {
    const normalized = normalizeBookmarkUrl(patch.url);
    if (!normalized.ok) {
      return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarkUrlInvalid } };
    }
    next.url = normalized.url;
    next.domain = normalized.domain;
  }

  const bookmarks = [...library.bookmarks];
  bookmarks[index] = next;
  const collections = syncCollectionMembership(
    library.collections,
    next.id,
    next.collectionIds
  );

  return {
    ok: true,
    value: { ...library, bookmarks, collections },
    events: [{ type: DOMAIN_CONFIG.events.bookmarkUpdated, payload: { bookmarkId: next.id } }],
  };
}

/**
 * 删除书签并清理所有主题中的悬挂引用。
 * REQ-007-AC-004
 */
export function deleteBookmark(
  library: LibraryData,
  input: DeleteBookmarkInput
): CommandResult<LibraryData> {
  if (!library.bookmarks.some((b) => b.id === input.id)) {
    return { ok: false, error: { ...DOMAIN_CONFIG.errors.bookmarkNotFound } };
  }

  return {
    ok: true,
    value: {
      ...library,
      bookmarks: library.bookmarks.filter((b) => b.id !== input.id),
      collections: library.collections.map((collection) => ({
        ...collection,
        bookmarkIds: collection.bookmarkIds.filter((id) => id !== input.id),
      })),
    },
    events: [{ type: DOMAIN_CONFIG.events.bookmarkDeleted, payload: { bookmarkId: input.id } }],
  };
}
