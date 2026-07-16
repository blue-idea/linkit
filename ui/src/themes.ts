import type { ThemeId } from './types';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  emoji: string;
  description: string;
  swatches: string[]; // for the picker preview
}

export const themes: ThemeDef[] = [
  {
    id: 'midnight',
    name: '午夜',
    emoji: '🌙',
    description: '深蓝夜空，默认主题',
    swatches: ['#0c1018', '#1a64e0', '#19c083', '#9b8cff'],
  },
  {
    id: 'ocean',
    name: '深海',
    emoji: '🌊',
    description: '青蓝海洋色调',
    swatches: ['#06141f', '#0ea5b7', '#22d3ee', '#3dd9a0'],
  },
  {
    id: 'graphite',
    name: '石墨',
    emoji: '⬛',
    description: '中性灰黑，专注低对比',
    swatches: ['#111113', '#3f3f46', '#71717a', '#e4e4e7'],
  },
  {
    id: 'sunset',
    name: '暮霞',
    emoji: '🌅',
    description: '暖橙玫红，柔和明亮',
    swatches: ['#1a1014', '#f97316', '#fb7185', '#fbbf24'],
  },
];

export const defaultSettings = {
  storageMode: 'local' as const,
  theme: 'midnight' as ThemeId,
  ai: { apiBase: '', model: '', apiKey: '' },
};

export function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
}
