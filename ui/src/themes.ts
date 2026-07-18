import type { ThemeId, UiLocale } from './types';

export interface ThemeDef {
  id: ThemeId;
  /** 稳定英文名；展示层通过 i18n 解析本地化标签。 */
  name: string;
  emoji: string;
  description: string;
  swatches: string[]; // for the picker preview
}

export const themes: ThemeDef[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    description: 'Deep navy night, the default look',
    swatches: ['#0c1018', '#1a64e0', '#19c083', '#9b8cff'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    description: 'Cyan ocean tones',
    swatches: ['#06141f', '#0ea5b7', '#22d3ee', '#3dd9a0'],
  },
  {
    id: 'graphite',
    name: 'Graphite',
    emoji: '⬛',
    description: 'Neutral graphite for low contrast focus',
    swatches: ['#111113', '#3f3f46', '#71717a', '#e4e4e7'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    description: 'Warm orange and rose',
    swatches: ['#1a1014', '#f97316', '#fb7185', '#fbbf24'],
  },
];

export const defaultSettings = {
  storageMode: 'local' as const,
  theme: 'midnight' as ThemeId,
  locale: 'en' as UiLocale,
  ai: { apiBase: '', model: '' },
};

export function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
}
