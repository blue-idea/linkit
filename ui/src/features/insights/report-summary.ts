/** 洞察报告顶部指标与分布条所需的轻量书签视图。 */
export interface InsightsReportBookmark {
  id: string;
  title: string;
  categoryId: string;
  collectionIds: string[];
  createdAt: string;
  visitCount: number;
  lastVisitedAt: string | null;
}

export interface InsightsReportCategory {
  id: string;
  name: string;
}

export interface InsightsReportCollection {
  id: string;
  name: string;
  bookmarkIds: string[];
}

export interface InsightsReportSummary {
  addedThisWeek: number;
  addedPriorWeek: number;
  activeCollectionCount: number;
  topCollectionName: string | null;
  totalVisits: number;
  topVisitedTitle: string | null;
  weeklyByCategory: { categoryId: string; categoryName: string; count: number }[];
}

const WEEK_MS = 7 * 86_400_000;

function inRange(iso: string, start: number, end: number): boolean {
  const ts = Date.parse(iso);
  return ts >= start && ts < end;
}

/** 从当前资料库计算洞察报告的可追溯汇总指标。 */
export function buildInsightsReportSummary(input: {
  bookmarks: InsightsReportBookmark[];
  categories: InsightsReportCategory[];
  collections: InsightsReportCollection[];
  now?: number;
}): InsightsReportSummary {
  const now = input.now ?? Date.now();
  const weekStart = now - WEEK_MS;
  const priorWeekStart = now - 2 * WEEK_MS;
  const categoryName = new Map(input.categories.map((c) => [c.id, c.name]));

  const addedThisWeek = input.bookmarks.filter((b) => inRange(b.createdAt, weekStart, now)).length;
  const addedPriorWeek = input.bookmarks.filter((b) => inRange(b.createdAt, priorWeekStart, weekStart)).length;

  const totalVisits = input.bookmarks.reduce((sum, b) => sum + b.visitCount, 0);
  const topVisited = [...input.bookmarks].sort((a, b) => b.visitCount - a.visitCount || a.id.localeCompare(b.id))[0];

  const recentBookmarkIds = new Set(
    input.bookmarks
      .filter((b) => inRange(b.createdAt, weekStart, now)
        || (b.lastVisitedAt != null && inRange(b.lastVisitedAt, weekStart, now)))
      .map((b) => b.id),
  );
  const activeCollections = input.collections.filter((col) =>
    col.bookmarkIds.some((id) => recentBookmarkIds.has(id)),
  );
  const topCollection = [...activeCollections]
    .map((col) => ({
      col,
      score: col.bookmarkIds.filter((id) => recentBookmarkIds.has(id)).length,
    }))
    .sort((a, b) => b.score - a.score || a.col.id.localeCompare(b.col.id))[0]?.col ?? null;

  const byCategory = new Map<string, number>();
  input.bookmarks
    .filter((b) => inRange(b.createdAt, weekStart, now))
    .forEach((b) => byCategory.set(b.categoryId, (byCategory.get(b.categoryId) ?? 0) + 1));

  const weeklyByCategory = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([categoryId, count]) => ({
      categoryId,
      categoryName: categoryName.get(categoryId) ?? categoryId,
      count,
    }));

  return {
    addedThisWeek,
    addedPriorWeek,
    activeCollectionCount: activeCollections.length,
    topCollectionName: topCollection?.name ?? null,
    totalVisits,
    topVisitedTitle: topVisited && topVisited.visitCount > 0 ? topVisited.title : null,
    weeklyByCategory,
  };
}
