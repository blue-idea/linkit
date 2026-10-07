import type { Bookmark, Category, Tag, TagColor } from '../../types';

export type BookmarkPresentation = {
  id: string;
  title: string;
  url: string;
  categoryId: string;
  categoryName?: string;
  domain: string;
  description: string;
  summary: string;
  tags: Array<{ id: string; label: string; color: TagColor }>;
  starred: boolean;
  pinned: boolean;
  health: NonNullable<Bookmark['health']>;
  visitCount: number;
  createdAt: string;
  thumbnail: string | null;
  favicon: string;
  faviconColor: TagColor;
};

/**
 * 将书签投影为三视图共享的可读元数据。
 * REQ-015-AC-001~003
 */
export function presentBookmark(
  bookmark: Bookmark,
  tags: Tag[],
  categories?: Category[]
): BookmarkPresentation {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  // 查找书签所属的直接分类（只显示最近一级分类名称）
  const category = categories?.find((c) => c.id === bookmark.categoryId);
  return {
    id: bookmark.id,
    title: bookmark.title,
    url: bookmark.url,
    categoryId: bookmark.categoryId,
    categoryName: category?.name,
    domain: bookmark.domain,
    description: bookmark.description ?? '',
    // 列表摘要优先 AI；无摘要时回退站点描述，避免列表空白。
    summary: (bookmark.aiSummary?.trim() || bookmark.description?.trim() || ''),
    tags: bookmark.tags
      .map((tagId) => tagById.get(tagId))
      .filter((tag): tag is Tag => Boolean(tag))
      .map((tag) => ({ id: tag.id, label: tag.label, color: tag.color })),
    starred: bookmark.starred,
    pinned: bookmark.pinned,
    health: bookmark.health ?? 'ok',
    visitCount: bookmark.visitCount,
    createdAt: bookmark.createdAt,
    thumbnail: bookmark.thumbnail ?? null,
    favicon: bookmark.favicon,
    faviconColor: bookmark.faviconColor,
  };
}

export function presentBookmarks(
  bookmarks: Bookmark[],
  tags: Tag[],
  categories?: Category[]
): BookmarkPresentation[] {
  return bookmarks.map((bookmark) => presentBookmark(bookmark, tags, categories));
}

