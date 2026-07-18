import { beforeEach, describe, expect, test } from 'vitest';
import { I18N_CONFIG, SETTINGS_SECTION_KEYS } from '../config/i18n';
import {
  createI18n,
  getSettingsSections,
  localizeError,
  type I18nApi,
} from './index';

describe('i18n', () => {
  let i18n: I18nApi;

  beforeEach(() => {
    i18n = createI18n();
  });

  // REQ-023-AC-004：无偏好时默认 UI 语言为 English。
  test('createI18n 默认 locale 为 en', () => {
    expect(i18n.getLocale()).toBe(I18N_CONFIG.defaultLocale);
    expect(i18n.t('settings.title')).toBe('Settings');
    expect(i18n.t('auth.localMode')).toBe('Continue in local mode');
  });

  // REQ-023-AC-005：切换到中文后更新可见文案。
  test('setLocale 切换到 zh 后返回中文文案', () => {
    i18n.setLocale('zh');
    expect(i18n.getLocale()).toBe('zh');
    expect(i18n.t('settings.title')).toBe('设置');
    expect(i18n.t('auth.localMode')).toBe('使用本地模式（无需登录）');
  });

  // REQ-023-AC-005：缺失翻译键回退到 English。
  test('缺失翻译键回退到英文', () => {
    i18n.setLocale('zh');
    expect(i18n.t('test.missing.key.only.in.en' as 'settings.title')).toBe(
      'English fallback only'
    );
  });

  // REQ-023-AC-006：locale=zh 时错误显示中文并保留稳定英文消息键。
  test('localizeError 在 zh 下返回中文文案与英文 key', () => {
    const result = localizeError('SETTINGS_INVALID', 'zh');
    expect(result.key).toBe('SETTINGS_INVALID');
    expect(result.message).toBe('设置无效');
    expect(localizeError('SETTINGS_INVALID', 'en').message).toBe(
      'Settings document is invalid'
    );
  });

  // REQ-023-AC-001：Settings 必须提供五类入口。
  test('getSettingsSections 返回 General Storage AI Appearance Language', () => {
    const sections = getSettingsSections(i18n);
    expect(sections.map((s) => s.id)).toEqual([...SETTINGS_SECTION_KEYS]);
    expect(sections.map((s) => s.label)).toEqual([
      'General',
      'Storage',
      'AI',
      'Appearance',
      'Language',
    ]);

    i18n.setLocale('zh');
    expect(getSettingsSections(i18n).map((s) => s.label)).toEqual([
      '通用',
      '存储',
      'AI',
      '外观',
      '语言',
    ]);
  });
});
