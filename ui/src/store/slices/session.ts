import { STORE_CONFIG } from '../../config/store';
import type { AppStoreSlice, SessionSlice } from '../types';

export const createSessionSlice: AppStoreSlice<SessionSlice> = (set) => ({
  session: {
    mode: STORE_CONFIG.defaultSessionMode,
    userId: null,
    initialized: false,
    error: null,
  },
  useLocalMode: () => set((state) => ({
    session: { ...state.session, mode: 'local', userId: null, initialized: true },
  })),
  setSessionError: (error) => set((state) => ({
    session: { ...state.session, error },
  })),
});
