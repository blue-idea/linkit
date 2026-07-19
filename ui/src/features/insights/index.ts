import type { LibraryData } from '../../domain/library';

export type InsightAction =
  | { type: 'new-bookmark' }
  | { type: 'health-filter'; status: 'changed' | 'broken' }
  | { type: 'collection'; collectionId: string }
  | { type: 'tag-filter'; tagId: string }
  | { type: 'read-filter'; status: 'unread' | 'reading' | 'read' | 'archived' };

export interface LibraryInsight {
  id: string;
  title: string;
  detail: string;
  metric: { label: string; value: number };
  evidence: string[];
  action: InsightAction;
  accent: 'blue' | 'green' | 'amber' | 'coral' | 'violet';
}

function mostFrequent(ids: string[]): { id: string; count: number } | null {
  const counts = new Map<string, number>();
  ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, count]) => ({ id, count }))[0] ?? null;
}

/** 当前资料库的确定性规则洞察；每张卡片都携带计算证据与行动目标。 */
export function buildLibraryInsights(library: LibraryData): LibraryInsight[] {
  const total = library.bookmarks.length;
  if (total === 0) {
    return [{
      id: 'empty-library', title: 'Start your library', detail: 'Add a bookmark to generate traceable insights.',
      metric: { label: 'Bookmarks', value: 0 }, evidence: ['bookmarkCount=0'], action: { type: 'new-bookmark' }, accent: 'blue',
    }];
  }

  const insights: LibraryInsight[] = [];
  const changed = library.bookmarks.filter(({ health }) => health === 'changed').length;
  const broken = library.bookmarks.filter(({ health }) => health === 'broken').length;
  if (broken > 0 || changed > 0) {
    const status = broken > 0 ? 'broken' : 'changed';
    const value = broken > 0 ? broken : changed;
    insights.push({
      id: `health-${status}`, title: `${value} bookmarks need attention`,
      detail: `Open the ${status} health view to review the exact bookmarks.`,
      metric: { label: status === 'broken' ? 'Broken' : 'Changed', value },
      evidence: [`broken=${broken}`, `changed=${changed}`, `bookmarkCount=${total}`],
      action: { type: 'health-filter', status }, accent: status === 'broken' ? 'coral' : 'amber',
    });
  }

  const largestCollection = [...library.collections]
    .sort((a, b) => b.bookmarkIds.length - a.bookmarkIds.length || a.id.localeCompare(b.id))[0];
  if (largestCollection) {
    insights.push({
      id: `collection-${largestCollection.id}`, title: `${largestCollection.name} is your largest theme`,
      detail: 'Open the theme to review its members and coverage.',
      metric: { label: 'Members', value: largestCollection.bookmarkIds.length },
      evidence: [`collectionId=${largestCollection.id}`, `memberCount=${largestCollection.bookmarkIds.length}`],
      action: { type: 'collection', collectionId: largestCollection.id }, accent: 'violet',
    });
  }

  const topTag = mostFrequent(library.bookmarks.flatMap(({ tagIds }) => tagIds));
  if (topTag) {
    const label = library.tags.find(({ id }) => id === topTag.id)?.label ?? topTag.id;
    insights.push({
      id: `tag-${topTag.id}`, title: `${label} is your most used tag`, detail: 'Open the tag filter to inspect related bookmarks.',
      metric: { label: 'Bookmarks', value: topTag.count }, evidence: [`tagId=${topTag.id}`, `usageCount=${topTag.count}`],
      action: { type: 'tag-filter', tagId: topTag.id }, accent: 'green',
    });
  }

  const unread = library.bookmarks.filter(({ readStatus }) => readStatus === 'unread').length;
  if (unread > 0) {
    insights.push({
      id: 'unread-backlog', title: `${unread} bookmarks are unread`, detail: 'Open the unread filter to continue your reading queue.',
      metric: { label: 'Unread', value: unread }, evidence: [`unread=${unread}`, `bookmarkCount=${total}`],
      action: { type: 'read-filter', status: 'unread' }, accent: 'blue',
    });
  }
  return insights.slice(0, 6);
}

export { InsightsReportDialog } from './InsightsReportDialog';
