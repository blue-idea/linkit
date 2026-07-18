import i18next, { type i18n as I18nextInstance } from 'i18next';
import { I18N_CONFIG, SETTINGS_SECTION_KEYS, type AppLocale, type SettingsSectionKey } from '../config/i18n';
import { SETTINGS_ERROR_MESSAGES, type SettingsErrorKey } from '../config/settings';
import { catalogs, type MessageKey } from './catalogs';

export type TranslateOptions = Record<string, string | number>;

export interface I18nApi {
  getLocale(): AppLocale;
  setLocale(locale: AppLocale): void;
  t(key: MessageKey, options?: TranslateOptions): string;
}

function createInstance(locale: AppLocale = I18N_CONFIG.defaultLocale): I18nextInstance {
  const instance = i18next.createInstance();
  // 同步初始化：单元测试与首屏渲染均不依赖异步加载。
  void instance.init({
    lng: locale,
    fallbackLng: I18N_CONFIG.fallbackLocale,
    resources: {
      en: { translation: catalogs.en },
      zh: { translation: catalogs.zh },
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}

/** 创建独立 i18n 实例；默认 locale=en。覆盖 REQ-023-AC-004/005。 */
export function createI18n(locale: AppLocale = I18N_CONFIG.defaultLocale): I18nApi {
  const instance = createInstance(locale);

  return {
    getLocale: () => (instance.language === 'zh' ? 'zh' : 'en'),
    setLocale: (next) => {
      void instance.changeLanguage(next);
    },
    t: (key, options) => instance.t(key, options),
  };
}

/** 模块级默认实例，供非 React 调用与启动引导使用。 */
export const i18n = createI18n();

export function getSettingsSections(api: I18nApi = i18n): Array<{ id: SettingsSectionKey; label: string }> {
  return SETTINGS_SECTION_KEYS.map((id) => ({
    id,
    label: api.t(`settings.section.${id}` as MessageKey),
  }));
}

/**
 * 用户可见错误本地化：返回稳定英文 key + 当前语言文案。
 * 覆盖 REQ-023-AC-006。
 */
export function localizeError(
  key: SettingsErrorKey,
  locale: AppLocale
): { key: SettingsErrorKey; message: string } {
  const messages = SETTINGS_ERROR_MESSAGES[key];
  return {
    key,
    message: locale === 'zh' ? messages.zh : messages.en,
  };
}
