/** 书签排序与筛选引擎默认配置。REQ-009 */
export const QUERY_CONFIG = {
  sortKeys: ['recent', 'created', 'visits', 'title'] as const,
  dateRanges: ['all', '7d', '30d', '90d'] as const,
  dateRangeDays: {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  } as const,
  emptyFilters: {
    onlyStarred: false,
    tagIds: [] as string[],
    dateRange: 'all' as const,
    readStatus: 'all' as const,
  },
} as const;
