import type { ThemeId, UiLocale } from './types';

export interface ThemeDef {
  id: ThemeId;
  /** 稳定英文名；展示层通过 i18n 解析本地化标签。 */
  name: string;
  emoji: string;
  description: string;
  swatches: string[]; // 用于主题选择器预览
  light: boolean;
}

export const themes: ThemeDef[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    description: 'Deep navy night, the default look',
    swatches: ['#0b1120', '#2d7ff9', '#19c083', '#9b8cff'],
    light: false,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    description: 'Cyan ocean tones',
    swatches: ['#04101a', '#0ea5b7', '#22d3ee', '#3dd9a0'],
    light: false,
  },
  {
    id: 'graphite',
    name: 'Graphite',
    emoji: '⬛',
    description: 'Neutral graphite for low contrast focus',
    swatches: ['#0a0a0c', '#3f3f46', '#71717a', '#e4e4e7'],
    light: false,
  },
  {
    id: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    description: 'Warm orange and rose',
    swatches: ['#160c10', '#f97316', '#fb7185', '#fbbf24'],
    light: false,
  },
  {
    id: 'daylight',
    name: 'Daylight',
    emoji: '☀️',
    description: 'Clean light surfaces with blue accents',
    swatches: ['#eef2f8', '#2d7ff9', '#19c083', '#7c6bff'],
    light: true,
  },
  {
    id: 'paper',
    name: 'Paper',
    emoji: '📜',
    description: 'Warm paper surfaces with terracotta accents',
    swatches: ['#f7f3ee', '#d97757', '#a87850', '#78a878'],
    light: true,
  },
];

export const defaultSettings = {
  storageMode: 'local' as const,
  theme: 'midnight' as ThemeId,
  locale: 'en' as UiLocale,
  ai: { apiBase: '', model: '' },
  aiConsent: null as null,
};

export function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
}
