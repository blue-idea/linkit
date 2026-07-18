import type { AppSettings } from '../domain/library';

/** 本机设置正式默认值；locale 默认 en，AI 默认未配置。 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  settingsVersion: 1,
  storageMode: 'local',
  theme: 'midnight',
  locale: 'en',
  ai: { apiBase: '', model: '' },
  aiConsent: null,
  view: { defaultMode: 'card' },
  lastCloudRevision: null,
};

/** 稳定英文错误键到中英文本的映射（UI 文案层使用）。 */
export const SETTINGS_ERROR_MESSAGES = {
  SETTINGS_INVALID: {
    en: 'Settings document is invalid',
    zh: '设置无效',
  },
} as const;

export type SettingsErrorKey = keyof typeof SETTINGS_ERROR_MESSAGES;
