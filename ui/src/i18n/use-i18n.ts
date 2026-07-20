import { createContext, createElement, useContext, useMemo } from 'react';
import type { AppLocale } from '../config/i18n';
import { createI18n, i18n as fallbackI18n, type I18nApi } from './index';

const I18nContext = createContext<I18nApi | null>(null);

/** 应用级语言上下文：设置 locale 变化时统一刷新所有后代 UI。 */
export function I18nProvider({
  locale,
  children,
}: {
  locale: AppLocale;
  children: React.ReactNode;
}) {
  const api = useMemo(() => createI18n(locale), [locale]);
  return createElement(I18nContext.Provider, { value: api }, children);
}

/** 优先使用显式 locale；未提供时消费应用级语言上下文。 */
export function useI18n(locale?: AppLocale): I18nApi {
  const context = useContext(I18nContext);
  const local = useMemo(() => (locale ? createI18n(locale) : null), [locale]);
  return local ?? context ?? fallbackI18n;
}
