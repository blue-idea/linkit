import type { LibraryEnvelope } from './schemas';
import { normalizeDomainFavicon, normalizeDomainFaviconColor } from './bookmark-icon';
import { validateLibraryEnvelope, type ValidationResult } from './validation';

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null && !Array.isArray(value);
const records = (value: unknown): RecordValue[] => Array.isArray(value) ? value.filter(isRecord) : [];
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export function migrateLibraryDocument(input: unknown, options: { now: string }): ValidationResult<LibraryEnvelope> {
  if (isRecord(input) && 'schemaVersion' in input) {
    if (input.schemaVersion !== 1) return { success: false, errors: [{ code: 'UNSUPPORTED_SCHEMA_VERSION', message: `Unsupported library schema version: ${String(input.schemaVersion)}`, path: ['schemaVersion'] }] };
    return validateLibraryEnvelope(input);
  }
  if (!isRecord(input)) return validateLibraryEnvelope(input);
  const collections = records(input.collections).map<RecordValue>((collection) => ({ ...collection,
    createdAt: collection.createdAt ?? options.now, updatedAt: collection.updatedAt ?? options.now }));
  const memberships = new Map<string, string[]>();
  collections.forEach((collection) => strings(collection.bookmarkIds).forEach((bookmarkId) => {
    memberships.set(bookmarkId, [...(memberships.get(bookmarkId) ?? []), String(collection.id)]);
  }));
  const bookmarks = records(input.bookmarks).map((bookmark) => ({
    id: bookmark.id, title: bookmark.title, url: bookmark.url, domain: bookmark.domain,
    favicon: normalizeDomainFavicon(bookmark.favicon),
    faviconColor: normalizeDomainFaviconColor(bookmark.faviconColor),
    description: bookmark.description ?? '', notes: bookmark.notes ?? '',
    tagIds: strings(bookmark.tagIds ?? bookmark.tags),
    categoryId: typeof bookmark.categoryId === 'string' && bookmark.categoryId.length > 0 ? bookmark.categoryId : null,
    collectionIds: [...new Set([...strings(bookmark.collectionIds), ...(memberships.get(String(bookmark.id)) ?? [])])],
    createdAt: bookmark.createdAt, updatedAt: bookmark.updatedAt ?? options.now,
    lastVisitedAt: bookmark.lastVisitedAt ?? null, visitCount: bookmark.visitCount ?? 0,
    starred: bookmark.starred ?? false, pinned: bookmark.pinned ?? false,
    readStatus: bookmark.readStatus ?? 'unread', health: bookmark.health ?? 'ok',
    healthCheckedAt: bookmark.healthCheckedAt ?? null, healthHttpStatus: bookmark.healthHttpStatus ?? null,
    healthFingerprint: bookmark.healthFingerprint ?? null, healthErrorCode: bookmark.healthErrorCode ?? null,
    aiSummary: bookmark.aiSummary ?? '', aiSuggestedTags: strings(bookmark.aiSuggestedTags),
    thumbnail: typeof bookmark.thumbnail === 'string' ? bookmark.thumbnail : null }));
  return validateLibraryEnvelope({ format: 'linkit-library', schemaVersion: 1, revision: 0, updatedAt: options.now,
    data: { bookmarks, categories: input.categories, collections, tags: input.tags } });
}
