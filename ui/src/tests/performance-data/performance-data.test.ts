import { describe, expect, test } from 'vitest';
import { validateLibraryEnvelope, type LibraryEnvelope } from '../../domain/library';

interface PerformanceDataOptions {
  bookmarkCount?: number;
  seed?: string;
}

interface PerformanceDataModule {
  generatePerformanceLibrary: (options?: PerformanceDataOptions) => LibraryEnvelope;
}

async function loadPerformanceDataModule(): Promise<Partial<PerformanceDataModule>> {
  const modulePath = '../../testing/performance-data/index.ts';
  return import(/* @vite-ignore */ modulePath).catch(() => ({}));
}

describe('性能数据生成器', () => {
  // REQ-028-AC-005~007：固定 seed 必须生成可重复的性能基线。
  test('生成器在 seed 与规模相同时返回完全相同的资料库', async () => {
    const performanceData = await loadPerformanceDataModule();
    const generate = performanceData.generatePerformanceLibrary;

    expect(generate).toBeTypeOf('function');
    if (!generate) throw new Error('Performance data generator is required');

    const first = generate({ bookmarkCount: 32, seed: 'deterministic-seed' });
    const second = generate({ bookmarkCount: 32, seed: 'deterministic-seed' });
    const different = generate({ bookmarkCount: 32, seed: 'different-seed' });

    expect(first).toStrictEqual(second);
    expect(first.data.bookmarks[0]?.id).not.toBe(different.data.bookmarks[0]?.id);
  });

  // REQ-026-AC-001~003、REQ-028-AC-005~007：10,000 条基线必须通过完整 Schema 与引用校验。
  // CI coverage 插桩会显著拉长生成+校验耗时，单独放宽超时避免临界失败。
  test(
    '生成器创建 10,000 个唯一书签并保持全部引用有效',
    async () => {
      const performanceData = await loadPerformanceDataModule();
      const generate = performanceData.generatePerformanceLibrary;

      expect(generate).toBeTypeOf('function');
      if (!generate) throw new Error('Performance data generator is required');

      const library = generate({ bookmarkCount: 10_000, seed: 'task-004-validation' });
      const bookmarkIds = library.data.bookmarks.map(({ id }) => id);

      expect(library.data.bookmarks).toHaveLength(10_000);
      expect(new Set(bookmarkIds).size).toBe(10_000);
      expect(validateLibraryEnvelope(library)).toEqual({ success: true, data: library });
    },
    30_000
  );

  // REQ-026-AC-002：性能数据出现重复实体 ID 时必须返回结构化错误，禁止静默接受。
  test('生成数据在书签 ID 被改为重复值时返回 DUPLICATE_ENTITY_ID', async () => {
    const performanceData = await loadPerformanceDataModule();
    const generate = performanceData.generatePerformanceLibrary;

    expect(generate).toBeTypeOf('function');
    if (!generate) throw new Error('Performance data generator is required');

    const library = generate({ bookmarkCount: 8, seed: 'duplicate-check' });
    library.data.bookmarks[7].id = library.data.bookmarks[0].id;

    expect(validateLibraryEnvelope(library)).toMatchObject({
      success: false,
      errors: expect.arrayContaining([expect.objectContaining({ code: 'DUPLICATE_ENTITY_ID' })]),
    });
  });

  // TASK-004：生成规模必须是可安全分配的非负整数。
  test('生成器在书签数量为负数或小数时返回明确错误', async () => {
    const performanceData = await loadPerformanceDataModule();
    const generate = performanceData.generatePerformanceLibrary;

    expect(generate).toBeTypeOf('function');
    if (!generate) throw new Error('Performance data generator is required');

    expect(() => generate({ bookmarkCount: -1 })).toThrow('Bookmark count must be a non-negative integer');
    expect(() => generate({ bookmarkCount: 1.5 })).toThrow('Bookmark count must be a non-negative integer');
  });
});
