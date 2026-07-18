import type { AppStoreState } from './types';

// 细粒度 selector 避免组件订阅整个 Store。
export const selectBookmarks = (state: AppStoreState) => state.library.envelope.data.bookmarks;
export const selectSessionMode = (state: AppStoreState) => state.session.mode;
export const selectSyncStatus = (state: AppStoreState) => state.sync.status;
export const selectTheme = (state: AppStoreState) => state.settings.theme;
export const selectSelectedBookmarkId = (state: AppStoreState) => state.ui.selectedBookmarkId;
