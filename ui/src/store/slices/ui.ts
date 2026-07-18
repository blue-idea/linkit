import { STORE_CONFIG } from '../../config/store';
import type { AppStoreSlice, UiSlice } from '../types';

export const createUiSlice: AppStoreSlice<UiSlice> = (set) => ({
  ui: {
    selection: { ...STORE_CONFIG.defaultSelection },
    filters: {
      ...STORE_CONFIG.defaultFilters,
      tagIds: [...STORE_CONFIG.defaultFilters.tagIds],
    },
    view: STORE_CONFIG.defaultView,
    selectedBookmarkId: null,
    panel: null,
    dialog: null,
  },
  selectBookmark: (selectedBookmarkId) => set((state) => ({
    ui: { ...state.ui, selectedBookmarkId },
  })),
});
