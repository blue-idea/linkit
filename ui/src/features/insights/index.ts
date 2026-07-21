import type { LibraryData } from '../../domain/library';
import type { TranslateOptions } from '../../i18n';
import type { MessageKey } from '../../i18n/catalogs';

export type InsightAction =
  | { type: 'new-bookmark' }
  | { type: 'health-filter'; status: 'changed' | 'broken' }
  | { type: 'collection'; collectionId: string }
  | { type: 'tag-filter'; tagId: string }
  | { type: 'read-filter'; status: 'unread' | 'reading' | 'read' | 'archived' };

export interface LibraryInsight {
  id: string;
  titleKey: MessageKey;
  titleParams?: TranslateOptions;
  detailKey: MessageKey;
  detailParams?: TranslateOptions;
  metric: { labelKey: MessageKey; value: number };
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

/** 当前资料库的确定性规则洞察；文案键在 UI 层按设置语言渲染。 */
export function buildLibraryInsights(library: LibraryData): LibraryInsight[] {
  const total = library.bookmarks.length;
  if (total === 0) {
    return [{
      id: 'empty-library',
      titleKey: 'insights.card.empty.title',
      detailKey: 'insights.card.empty.detail',
      metric: { labelKey: 'insights.metric.label.bookmarks', value: 0 },
      evidence: ['bookmarkCount=0'],
      action: { type: 'new-bookmark' },
      accent: 'blue',
    }];
  }

  const insights: LibraryInsight[] = [];
  const changed = library.bookmarks.filter(({ health }) => health === 'changed').length;
  const broken = library.bookmarks.filter(({ health }) => health === 'broken').length;
  if (broken > 0 || changed > 0) {
    const status = broken > 0 ? 'broken' : 'changed';
    const value = broken > 0 ? broken : changed;
    insights.push({
      id: `health-${status}`,
      titleKey: 'insights.card.health.title',
      titleParams: { count: value },
      detailKey: status === 'broken' ? 'insights.card.health.detailBroken' : 'insights.card.health.detailChanged',
      metric: {
        labelKey: status === 'broken' ? 'insights.metric.label.broken' : 'insights.metric.label.changed',
        value,
      },
      evidence: [`broken=${broken}`, `changed=${changed}`, `bookmarkCount=${total}`],
      action: { type: 'health-filter', status },
      accent: status === 'broken' ? 'coral' : 'amber',
    });
  }

  const largestCollection = [...library.collections]
    .sort((a, b) => b.bookmarkIds.length - a.bookmarkIds.length || a.id.localeCompare(b.id))[0];
  if (largestCollection) {
    insights.push({
      id: `collection-${largestCollection.id}`,
      titleKey: 'insights.card.collection.title',
      titleParams: { name: largestCollection.name },
      detailKey: 'insights.card.collection.detail',
      metric: { labelKey: 'insights.metric.label.members', value: largestCollection.bookmarkIds.length },
      evidence: [`collectionId=${largestCollection.id}`, `memberCount=${largestCollection.bookmarkIds.length}`],
      action: { type: 'collection', collectionId: largestCollection.id },
      accent: 'violet',
    });
  }

  const topTag = mostFrequent(library.bookmarks.flatMap(({ tagIds }) => tagIds));
  if (topTag) {
    const label = library.tags.find(({ id }) => id === topTag.id)?.label ?? topTag.id;
    insights.push({
      id: `tag-${topTag.id}`,
      titleKey: 'insights.card.tag.title',
      titleParams: { label },
      detailKey: 'insights.card.tag.detail',
      metric: { labelKey: 'insights.metric.label.bookmarks', value: topTag.count },
      evidence: [`tagId=${topTag.id}`, `usageCount=${topTag.count}`],
      action: { type: 'tag-filter', tagId: topTag.id },
      accent: 'green',
    });
  }

  const unread = library.bookmarks.filter(({ readStatus }) => readStatus === 'unread').length;
  if (unread > 0) {
    insights.push({
      id: 'unread-backlog',
      titleKey: 'insights.card.unread.title',
      titleParams: { count: unread },
      detailKey: 'insights.card.unread.detail',
      metric: { labelKey: 'insights.metric.label.unread', value: unread },
      evidence: [`unread=${unread}`, `bookmarkCount=${total}`],
      action: { type: 'read-filter', status: 'unread' },
      accent: 'blue',
    });
  }
  return insights.slice(0, 6);
}

export { InsightsReportDialog } from './InsightsReportDialog';
export { buildInsightsReportSummary } from './report-summary';
export type { InsightsReportBookmark, InsightsReportCategory, InsightsReportCollection, InsightsReportSummary } from './report-summary';
