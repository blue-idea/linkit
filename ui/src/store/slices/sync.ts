import { STORE_CONFIG } from '../../config/store';
import type { LibraryEnvelope } from '../../domain/library';
import type { AppStoreSlice, SyncSlice } from '../types';

export function createSyncSlice(initialLibrary: LibraryEnvelope): AppStoreSlice<SyncSlice> {
  return (set) => ({
    sync: {
      activeMode: STORE_CONFIG.defaultStorageMode,
      revision: initialLibrary.revision,
      status: STORE_CONFIG.defaultSyncStatus,
      error: null,
      conflict: null,
    },
    markSyncSaving: () => set((state) => ({
      sync: { ...state.sync, status: 'saving', error: null },
    })),
    markSyncSaved: (result) => set((state) => ({
      library: {
        ...state.library,
        envelope: { ...state.library.envelope, revision: result.revision, updatedAt: result.updatedAt },
      },
      sync: {
        ...state.sync,
        revision: result.revision,
        status: 'saved',
        error: null,
        conflict: null,
      },
    })),
    markSyncError: (error) => set((state) => ({
      sync: { ...state.sync, status: 'error', error },
    })),
    setSyncConflict: (conflict) => set((state) => ({
      sync: { ...state.sync, status: 'conflict', error: null, conflict: structuredClone(conflict) },
    })),
    switchStorage: (activeMode) => set((state) => ({
      sync: { ...state.sync, activeMode },
    })),
  });
}
