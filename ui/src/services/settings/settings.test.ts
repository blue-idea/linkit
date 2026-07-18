import { describe, expect, test } from 'vitest';
import { AppSettingsSchema, type AppSettings } from '../../domain/library';
import {
  clearConsentIfApiBaseChanged,
  getDefaultAppSettings,
  localizeSettingsError,
  normalizeApiBase,
  parseSettingsJson,
  prepareSettingsForPersist,
} from './index';

function sampleSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    ...getDefaultAppSettings(),
    ...overrides,
    ai: { ...getDefaultAppSettings().ai, ...overrides.ai },
    view: { ...getDefaultAppSettings().view, ...overrides.view },
  };
}

describe('设置服务', () => {
  // REQ-023-AC-004：无偏好时正式默认语言必须为 en。
  test('getDefaultAppSettings 返回 locale=en 且 AI 未配置', () => {
    const defaults = getDefaultAppSettings();

    expect(defaults.locale).toBe('en');
    expect(defaults.theme).toBe('midnight');
    expect(defaults.storageMode).toBe('local');
    expect(defaults.ai).toEqual({ apiBase: '', model: '' });
    expect(defaults.aiConsent).toBeNull();
    expect(AppSettingsSchema.safeParse(defaults).success).toBe(true);
  });

  // REQ-019-AC-001：有效设置 JSON 必须通过 Zod，且拒绝 API Key 字段。
  test('parseSettingsJson 接受有效设置并拒绝包含 apiKey 的载荷', () => {
    const valid = sampleSettings({
      theme: 'ocean',
      ai: { apiBase: 'https://api.example.test/v1', model: 'test-model' },
    });
    expect(parseSettingsJson(JSON.stringify(valid))).toEqual({ success: true, data: valid });

    const withKey = {
      ...valid,
      ai: { ...valid.ai, apiKey: 'secret' },
    };
    const rejected = parseSettingsJson(JSON.stringify(withKey));
    expect(rejected.success).toBe(false);
  });

  // REQ-019-AC-006：API Base 改变时本地准备持久化的设置必须清除 consent。
  test('prepareSettingsForPersist 在 API Base 变化时清除不匹配 consent', () => {
    const previous = sampleSettings({
      ai: { apiBase: 'https://api.example.test/v1', model: 'test-model' },
      aiConsent: {
        apiBase: 'https://api.example.test/v1',
        grantedAt: '2026-07-18T09:00:00.000Z',
      },
    });
    const next = sampleSettings({
      ai: { apiBase: 'https://other.example.test/v1', model: 'test-model' },
      aiConsent: previous.aiConsent,
    });

    const prepared = prepareSettingsForPersist(next, previous);
    expect(prepared.aiConsent).toBeNull();
    expect(clearConsentIfApiBaseChanged(next)).toBeNull();
  });

  // REQ-019-AC-005：授权匹配前必须规范化 API Base。
  test('normalizeApiBase 去掉尾随斜杠以供 consent 匹配', () => {
    expect(normalizeApiBase('https://api.example.test/v1/')).toBe('https://api.example.test/v1');
    expect(normalizeApiBase(' https://api.example.test/v1 ')).toBe('https://api.example.test/v1');
  });

  // REQ-023-AC-003：主题偏好必须能作为可持久化设置通过校验。
  test('主题枚举均可通过 Schema 校验', () => {
    for (const theme of ['midnight', 'ocean', 'graphite', 'sunset'] as const) {
      expect(AppSettingsSchema.safeParse(sampleSettings({ theme })).success).toBe(true);
    }
  });

  // REQ-023-AC-006：locale=zh 时返回中文错误文案并保留稳定英文消息键。
  test('localizeSettingsError 在 zh 下返回中文文案与英文 key', () => {
    const result = localizeSettingsError('SETTINGS_INVALID', 'zh');

    expect(result.key).toBe('SETTINGS_INVALID');
    expect(result.message).toBe('设置无效');
    expect(localizeSettingsError('SETTINGS_INVALID', 'en').message).toBe('Settings document is invalid');
  });
});
