import { AppSettingsSchema, type AppSettings } from '../../domain/library';
import type { AppSettings as UiAppSettings, ThemeId } from '../../types';
import { mergeShortcuts } from '../../features/shell/shortcuts';
import { DEFAULT_UI_SIZE } from '../../config/window-size';
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

/** 将领域设置投影到 UI，保留默认视图等可移植字段。 */
export function toUiAppSettings(domain: AppSettings, legacy: UiAppSettings): UiAppSettings {
  return {
    storageMode: domain.storageMode,
    theme: (domain.theme as ThemeId) || legacy.theme,
    locale: domain.locale === 'zh' || domain.locale === 'en'
      ? domain.locale
      : legacy.locale ?? 'en',
    ai: {
      apiBase: domain.ai.apiBase || legacy.ai.apiBase,
      model: domain.ai.model || legacy.ai.model,
    },
    aiConsent: domain.aiConsent,
    view: { ...domain.view },
    shortcuts: domain.shortcuts,
    uiSize: domain.uiSize,
  };
}

/** 将 UI 设置补全为可由 settingsstore 严格校验的领域文档。 */
export function toDomainAppSettings(settings: UiAppSettings): AppSettings {
  const defaults = getDefaultAppSettings();
  return prepareSettingsForPersist({
    ...defaults,
    storageMode: settings.storageMode,
    theme: settings.theme,
    locale: settings.locale ?? 'en',
    ai: {
      apiBase: settings.ai.apiBase || '',
      model: settings.ai.model || '',
    },
    aiConsent: settings.aiConsent ?? null,
    view: settings.view ? { ...settings.view } : defaults.view,
    shortcuts: mergeShortcuts(settings.shortcuts),
    uiSize: settings.uiSize ?? DEFAULT_UI_SIZE,
  });
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
