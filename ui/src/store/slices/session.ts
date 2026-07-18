import { STORE_CONFIG } from '../../config/store';
import type { AppError } from '../../repositories';
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
  // REQ-001-AC-001/002/004：认证成功后进入 authenticated。
  markAuthenticated: (userId) => set((state) => ({
    session: { ...state.session, mode: 'authenticated', userId, initialized: true, error: null },
  })),
  // REQ-002-AC-003：退出只清会话字段，不触碰 library。
  markSignedOut: () => set((state) => ({
    session: { ...state.session, mode: 'signed_out', userId: null, initialized: true, error: null },
  })),
  setSessionError: (error: AppError) => set((state) => ({
    session: { ...state.session, error },
  })),
});
