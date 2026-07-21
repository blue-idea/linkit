import { describe, expect, test } from 'vitest';
import { buildInsightsReportSummary } from './report-summary';

describe('洞察报告汇总指标', () => {
  const now = Date.parse('2026-07-21T12:00:00.000Z');

  test('计算本周与上周新增、访问总量与分类分布', () => {
    const summary = buildInsightsReportSummary({
      now,
      bookmarks: [
        { id: 'a', title: 'A', categoryId: 'c1', collectionIds: ['col-a'], createdAt: '2026-07-20T00:00:00.000Z', visitCount: 10, lastVisitedAt: null },
        { id: 'b', title: 'B', categoryId: 'c1', collectionIds: [], createdAt: '2026-07-10T00:00:00.000Z', visitCount: 2, lastVisitedAt: null },
        { id: 'c', title: 'C', categoryId: 'c2', collectionIds: [], createdAt: '2026-07-01T00:00:00.000Z', visitCount: 5, lastVisitedAt: null },
      ],
      categories: [
        { id: 'c1', name: 'Tech' },
        { id: 'c2', name: 'Design' },
      ],
      collections: [
        { id: 'col-a', name: 'Build', bookmarkIds: ['a'] },
      ],
    });
    expect(summary.addedThisWeek).toBe(1);
    expect(summary.addedPriorWeek).toBe(1);
    expect(summary.totalVisits).toBe(17);
    expect(summary.topVisitedTitle).toBe('A');
    expect(summary.weeklyByCategory).toEqual([
      { categoryId: 'c1', categoryName: 'Tech', count: 1 },
    ]);
  });
});
