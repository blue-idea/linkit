import type { AppSettings } from '../../domain/library';
import type { AppStoreSlice, SettingsSlice } from '../types';

export function createSettingsSlice(initialSettings: AppSettings): AppStoreSlice<SettingsSlice> {
  return (set) => ({
    settings: structuredClone(initialSettings),
    updateSettings: (settings) => set((state) => ({
      settings: {
        ...state.settings,
        ...settings,
        ai: settings.ai ? { ...settings.ai } : state.settings.ai,
        view: settings.view ? { ...settings.view } : state.settings.view,
      },
    })),
  });
}
