import type { AppLocale } from '../config/i18n';

/** 根据界面语言格式化日期，不改写原始时间数据。 */
export function formatDate(iso: string, locale: AppLocale = 'en'): string {
  const date = new Date(iso);
  const now = new Date();
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
