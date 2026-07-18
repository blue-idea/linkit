export const STORE_CONFIG = {
  defaultSessionMode: 'signed_out',
  defaultStorageMode: 'local',
  defaultSyncStatus: 'idle',
  defaultSelection: { kind: 'all' },
  defaultFilters: {
    query: '',
    tagIds: [],
    dateRange: 'all',
    onlyStarred: false,
  },
  defaultView: 'card',
} as const;
