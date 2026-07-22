import type { LibraryEnvelope } from '../../domain/library';
import type { Bookmark, Category, Collection, LibraryData, Tag, TagColor } from '../../types';
import { bookmarkIconToUi } from '../bookmarks/icon-persistence';

/**
 * 将领域信封投影为 UI LibraryData（tags 字段使用 tag id 数组）。
 * REQ-005-AC-002
 */
export function toUiLibraryFromEnvelope(envelope: LibraryEnvelope): LibraryData {
  const data = envelope.data;
  return {
    bookmarks: data.bookmarks.map((bookmark): Bookmark => {
      const icon = bookmarkIconToUi(bookmark);
      return {
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      domain: bookmark.domain,
      favicon: icon.favicon,
      faviconColor: icon.faviconColor,
      description: bookmark.description,
      notes: bookmark.notes,
      tags: [...bookmark.tagIds],
      categoryId: bookmark.categoryId ?? '',
      collectionIds: [...bookmark.collectionIds],
      createdAt: bookmark.createdAt,
      lastVisitedAt: bookmark.lastVisitedAt,
      visitCount: bookmark.visitCount,
      starred: bookmark.starred,
      pinned: bookmark.pinned,
      readStatus: bookmark.readStatus,
      health: bookmark.health,
      aiSummary: bookmark.aiSummary || undefined,
      aiSuggestedTags: bookmark.aiSuggestedTags.length > 0 ? [...bookmark.aiSuggestedTags] : undefined,
      thumbnail: bookmark.thumbnail ?? undefined,
      };
    }),
    categories: data.categories.map((category): Category => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      parentId: category.parentId,
      color: (category.color ?? 'gray') as TagColor,
    })),
    collections: data.collections.map((collection): Collection => ({
      id: collection.id,
      name: collection.name,
      emoji: collection.emoji,
      color: collection.color as TagColor,
      description: collection.description,
      bookmarkIds: [...collection.bookmarkIds],
    })),
    tags: data.tags.map((tag): Tag => ({
      id: tag.id,
      label: tag.label,
      color: tag.color as TagColor,
    })),
  };
}

/**
 * 覆盖确认门禁：未确认时不返回任何可应用数据。
 * 覆盖 REQ-005-AC-002。
 */
export function applyConfirmedImport(
  envelope: LibraryEnvelope,
  confirmed: boolean
): LibraryData | null {
  if (!confirmed) {
    return null;
  }
  return toUiLibraryFromEnvelope(envelope);
}
