import type { ViewDensity } from './types';

export type Selection =
  | { kind: 'all' }
  | { kind: 'starred' }
  | { kind: 'recent' }
  | { kind: 'category'; id: string }
  | { kind: 'collection'; id: string }
  | { kind: 'tag'; id: string }
  | { kind: 'health'; status: 'broken' | 'changed' };

export type ReadStatusFilter = 'all' | 'unread' | 'reading' | 'read' | 'archived';

export interface Filters {
  query: string;
  tagIds: string[];
  dateRange: 'all' | '7d' | '30d' | '90d';
  onlyStarred: boolean;
  /** 阅读状态筛选；all 表示不过滤。REQ-008-AC-004 */
  readStatus: ReadStatusFilter;
}

export const emptyFilters: Filters = {
  query: '',
  tagIds: [],
  dateRange: 'all',
  onlyStarred: false,
  readStatus: 'all',
};

export interface AppState {
  selection: Selection;
  filters: Filters;
  density: ViewDensity;
  selectedBookmarkId: string | null;
  expandedCategories: Record<string, boolean>;
}
