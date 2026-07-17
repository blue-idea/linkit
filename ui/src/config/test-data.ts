export const TEST_DATA_CONFIG = {
  fixedTimestamp: '2026-07-16T12:00:00.000Z',
  defaultPerformanceSeed: 'linkit-performance-v1',
  performanceBookmarkCount: 10_000,
  performanceCategoryCount: 12,
  performanceCollectionCount: 8,
  performanceTagCount: 20,
  errors: {
    invalidBookmarkCount: 'Bookmark count must be a non-negative integer',
  },
} as const;
