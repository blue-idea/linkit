import { AppSettingsSchema, type AppSettings } from '../../domain/library';
import {
  DEFAULT_APP_SETTINGS,
  SETTINGS_ERROR_MESSAGES,
  type SettingsErrorKey,
} from '../../config/settings';

export type SettingsParseResult =
  | { success: true; data: AppSettings }
  | { success: false; error: unknown };

export function getDefaultAppSettings(): AppSettings {
  return structuredClone(DEFAULT_APP_SETTINGS);
}

export function parseSettingsJson(raw: string): SettingsParseResult {
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = AppSettingsSchema.safeParse(parsed);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error };
  }
}

/** 统一去掉首尾空白与尾随斜杠，供 consent 与 API Base 比较。 */
export function normalizeApiBase(apiBase: string): string {
  return apiBase.trim().replace(/\/+$/, '');
}

export function clearConsentIfApiBaseChanged(settings: AppSettings): AppSettings['aiConsent'] {
  if (!settings.aiConsent) {
    return null;
  }
  if (normalizeApiBase(settings.aiConsent.apiBase) !== normalizeApiBase(settings.ai.apiBase)) {
    return null;
  }
  return settings.aiConsent;
}

/**
 * 准备写入本机前的设置：在 API Base 相对上一份设置变化时清除授权。
 * Go SettingsService 仍会再次执行同样门禁。
 */
export function prepareSettingsForPersist(next: AppSettings, previous?: AppSettings): AppSettings {
  const apiBaseChanged =
    previous !== undefined && normalizeApiBase(previous.ai.apiBase) !== normalizeApiBase(next.ai.apiBase);

  return {
    ...next,
    aiConsent: apiBaseChanged ? null : clearConsentIfApiBaseChanged(next),
  };
}

export function localizeSettingsError(
  key: SettingsErrorKey,
  locale: AppSettings['locale']
): { key: SettingsErrorKey; message: string } {
  const messages = SETTINGS_ERROR_MESSAGES[key];
  return {
    key,
    message: locale === 'zh' ? messages.zh : messages.en,
  };
}
