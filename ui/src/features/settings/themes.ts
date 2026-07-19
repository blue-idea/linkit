import type { AppLocale } from '../../config/i18n';
import type { ThemeId } from '../../types';
import { createI18n } from '../../i18n';

const themeKeys = {
  midnight: 'theme.midnight',
  ocean: 'theme.ocean',
  graphite: 'theme.graphite',
  sunset: 'theme.sunset',
  daylight: 'theme.daylight',
  paper: 'theme.paper',
} as const;

/** 按 locale 解析主题展示名。覆盖 REQ-023-AC-003。 */
export function resolveThemeLabel(theme: ThemeId, locale: AppLocale): string {
  const api = createI18n(locale);
  return api.t(themeKeys[theme]);
}
