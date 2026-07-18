import { useMemo } from 'react';
import type { AppLocale } from '../config/i18n';
import { createI18n, type I18nApi } from './index';

/** 按当前 locale 返回稳定 i18n API；locale 变化时重建。 */
export function useI18n(locale: AppLocale = 'en'): I18nApi {
  return useMemo(() => createI18n(locale), [locale]);
}
