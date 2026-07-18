import { createStore } from 'zustand/vanilla';
import type { AppSettings, LibraryEnvelope } from '../domain/library';
import { createLibrarySlice } from './slices/library';
import { createSessionSlice } from './slices/session';
import { createSettingsSlice } from './slices/settings';
import { createSyncSlice } from './slices/sync';
import { createUiSlice } from './slices/ui';
import type { AppStoreState } from './types';

export * from './selectors';
export type * from './types';

export interface CreateAppStoreOptions {
  initialLibrary: LibraryEnvelope;
  initialSettings: AppSettings;
}

export function createAppStore(options: CreateAppStoreOptions) {
  return createStore<AppStoreState>()((...args) => ({
    ...createSessionSlice(...args),
    ...createLibrarySlice(options.initialLibrary)(...args),
    ...createSyncSlice(options.initialLibrary)(...args),
    ...createUiSlice(...args),
    ...createSettingsSlice(options.initialSettings)(...args),
  }));
}
