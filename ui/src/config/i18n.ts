/** i18n 集中配置：默认语言、支持语言与回退策略。 */
export const I18N_CONFIG = {
  defaultLocale: 'en' as const,
  supportedLocales: ['en', 'zh'] as const,
  fallbackLocale: 'en' as const,
} as const;

export type AppLocale = (typeof I18N_CONFIG.supportedLocales)[number];

/** Settings 分区稳定 key（UI 文案层）。 */
export const SETTINGS_SECTION_KEYS = [
  'general',
  'storage',
  'ai',
  'appearance',
  'language',
] as const;

export type SettingsSectionKey = (typeof SETTINGS_SECTION_KEYS)[number];
