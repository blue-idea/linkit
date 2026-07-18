/** Timeline / Tag Aggregation / Theme Space 聚合投影（REQ-016） */

export const NEVER_VISITED_GROUP_ID = 'never-visited';
export const NEVER_VISITED_LABEL = 'Never Visited';

export type TimelineTimeSource = 'createdAt' | 'lastVisitedAt';

export type TimelineBookmark = {
  id: string;
  createdAt: string;
  lastVisitedAt: string | null;
};

export type TimelineGroup = {
  id: string;
  label: string;
  bookmarkIds: string[];
};

export type TagRef = {
  id: string;
  label: string;
};

export type TagGroup = {
  tagId: string;
  label: string;
  bookmarkIds: string[];
  count: number;
};

export type ThemeCollection = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  bookmarkIds: string[];
};

export type ThemeContainer = {
  collectionId: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  bookmarkIds: string[];
  count: number;
};

/** 将 ISO 时间戳映射为 YYYY-MM 分组键与可读标签。 */
export function monthKeyFromIso(iso: string): { id: string; label: string } {
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const id = `${year}-${month}`;
  const label = date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { id, label };
}

/**
 * 按 createdAt 或 lastVisitedAt 分组；未访问项进入 Never Visited。
 * 有日期的组按时间倒序；Never Visited 固定沉底。
 */
export function groupBookmarksByTimeline(
  bookmarks: TimelineBookmark[],
  timeSource: TimelineTimeSource
): TimelineGroup[] {
  const buckets = new Map<string, TimelineGroup>();
  const neverVisitedIds: string[] = [];

  for (const bookmark of bookmarks) {
    if (timeSource === 'lastVisitedAt' && !bookmark.lastVisitedAt) {
      neverVisitedIds.push(bookmark.id);
      continue;
    }

    const iso = timeSource === 'createdAt' ? bookmark.createdAt : bookmark.lastVisitedAt!;
    const { id, label } = monthKeyFromIso(iso);
    const existing = buckets.get(id);
    if (existing) {
      existing.bookmarkIds.push(bookmark.id);
    } else {
      buckets.set(id, { id, label, bookmarkIds: [bookmark.id] });
    }
  }

  // 组内按时间戳倒序，保证同月内新项在前。
  for (const group of buckets.values()) {
    group.bookmarkIds.sort((aId, bId) => {
      const a = bookmarks.find((b) => b.id === aId)!;
      const b = bookmarks.find((b) => b.id === bId)!;
      const aIso = timeSource === 'createdAt' ? a.createdAt : a.lastVisitedAt!;
      const bIso = timeSource === 'createdAt' ? b.createdAt : b.lastVisitedAt!;
      return Date.parse(bIso) - Date.parse(aIso);
    });
  }

  const dated = [...buckets.values()].sort((a, b) => b.id.localeCompare(a.id));

  if (neverVisitedIds.length > 0) {
    dated.push({
      id: NEVER_VISITED_GROUP_ID,
      label: NEVER_VISITED_LABEL,
      bookmarkIds: neverVisitedIds,
    });
  }

  return dated;
}

/** 按标签聚合；仅包含有成员的标签，计数与成员列表一致。 */
export function groupBookmarksByTags(
  bookmarks: Array<{ id: string; tags: string[] }>,
  tags: TagRef[]
): TagGroup[] {
  const labelById = new Map(tags.map((tag) => [tag.id, tag.label]));
  const members = new Map<string, string[]>();

  for (const bookmark of bookmarks) {
    for (const tagId of bookmark.tags) {
      if (!labelById.has(tagId)) continue;
      const list = members.get(tagId);
      if (list) list.push(bookmark.id);
      else members.set(tagId, [bookmark.id]);
    }
  }

  return [...members.entries()]
    .map(([tagId, bookmarkIds]) => ({
      tagId,
      label: labelById.get(tagId) ?? tagId,
      bookmarkIds,
      count: bookmarkIds.length,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** 以主题为容器；成员仅保留资料库中仍存在的书签。 */
export function groupBookmarksByThemes(
  collections: ThemeCollection[],
  bookmarks: Array<{ id: string }>
): ThemeContainer[] {
  const existing = new Set(bookmarks.map((b) => b.id));
  return collections.map((collection) => {
    const bookmarkIds = collection.bookmarkIds.filter((id) => existing.has(id));
    return {
      collectionId: collection.id,
      name: collection.name,
      emoji: collection.emoji,
      color: collection.color,
      description: collection.description,
      bookmarkIds,
      count: bookmarkIds.length,
    };
  });
}
