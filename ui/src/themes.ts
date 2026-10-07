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
    id: 'obsidian',
    name: 'Obsidian',
    emoji: '🔮',
    description: 'Pro dark palette with refined three-pane depths and indigo electric accents',
    swatches: ['#0f1117', '#181b24', '#6366f1', '#818cf8'],
    light: false,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    emoji: '✨',
    description: 'Nordic emerald night with luminous teal accents across three-pane glass surfaces',
    swatches: ['#091512', '#0f1f1b', '#14b8a6', '#2dd4bf'],
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
  {
    id: 'cupertino',
    name: 'Cupertino',
    emoji: '🍏',
    description: 'Classic macOS tri-color styling with azure, soft yellow and lilac surfaces',
    swatches: ['#dae8fc', '#fef4c0', '#f0e9fc', '#007aff'],
    light: true,
  },
  {
    id: 'sequoia',
    name: 'Cappuccino',
    emoji: '☕',
    description: 'Italian retro cafe tri-color styling with warm latte, vanilla cream and pistachio green surfaces',
    swatches: ['#e8d0b6', '#fef8e6', '#e0f2e0', '#059669'],
    light: true,
  },
  {
    id: 'provence',
    name: 'Provence',
    emoji: '🌸',
    description: 'French Riviera pastel romance with smoky rose, whisper cashmere and frosted periwinkle surfaces',
    swatches: ['#eed4e0', '#fdf7fa', '#dee8fa', '#7c3aed'],
    light: true,
  },
  {
    id: 'monet',
    name: 'Monet',
    emoji: '🪷',
    description: 'Impressionist water lily garden styling with sage green, moonlit peach and sunset primrose surfaces',
    swatches: ['#d6ece2', '#fefaf4', '#fdf2da', '#0891b2'],
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
