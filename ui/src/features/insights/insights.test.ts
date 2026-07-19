import { describe, expect, test } from 'vitest';
import { createCoreJourneySeed, createLibraryEnvelope } from '../../testing/factories';
import { generatePerformanceLibrary } from '../../testing/performance-data';
import { buildLibraryInsights } from './index';

describe('收藏洞察计算', () => {
  test('空资料库返回可执行的入库提示且指标可追溯', () => {
    const insights = buildLibraryInsights(createLibraryEnvelope({ bookmarks: [], categories: [], collections: [], tags: [] }).data);
    expect(insights).toEqual([expect.objectContaining({
      id: 'empty-library', metric: { label: 'Bookmarks', value: 0 },
      action: { type: 'new-bookmark' }, evidence: ['bookmarkCount=0'],
    })]);
  });

  test('少量数据生成健康、主题与标签洞察并绑定行动目标', () => {
    const insights = buildLibraryInsights(createCoreJourneySeed().library.data);
    expect(insights.some(({ action }) => action.type === 'health-filter')).toBe(true);
    expect(insights.some(({ action }) => action.type === 'collection')).toBe(true);
    expect(insights.every(({ evidence }) => evidence.length > 0)).toBe(true);
  });

  test('10,000 条数据在单次计算中返回稳定有限卡片', () => {
    const library = generatePerformanceLibrary({ bookmarkCount: 10_000, seed: 'task-038' }).data;
    const started = performance.now();
    const first = buildLibraryInsights(library);
    const durationMs = performance.now() - started;
    const second = buildLibraryInsights(library);
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    expect(first.length).toBeLessThanOrEqual(6);
    expect(durationMs).toBeLessThan(500);
  });
});
