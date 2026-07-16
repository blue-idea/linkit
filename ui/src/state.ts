import type { ViewDensity } from './types';

export type Selection =
  | { kind: 'all' }
  | { kind: 'starred' }
  | { kind: 'recent' }
  | { kind: 'category'; id: string }
  | { kind: 'collection'; id: string }
  | { kind: 'tag'; id: string }
  | { kind: 'health'; status: 'broken' | 'changed' };

export interface Filters {
  query: string;
  tagIds: string[];
  dateRange: 'all' | '7d' | '30d' | '90d';
  onlyStarred: boolean;
}

export const emptyFilters: Filters = {
  query: '',
  tagIds: [],
  dateRange: 'all',
  onlyStarred: false,
};

export interface AppState {
  selection: Selection;
  filters: Filters;
  density: ViewDensity;
  selectedBookmarkId: string | null;
  expandedCategories: Record<string, boolean>;
}
