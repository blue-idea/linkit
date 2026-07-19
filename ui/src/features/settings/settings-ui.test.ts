import { describe, expect, test } from 'vitest';
import { SETTINGS_SECTION_KEYS } from '../../config/i18n';
import { themes } from '../../themes';
import { listSettingsSections } from './sections';
import { resolveThemeLabel } from './themes';

describe('设置 UI 规格', () => {
  // REQ-023-AC-001：打开 Settings 时可发现五个分区。
  test('listSettingsSections 暴露五个稳定分区 id', () => {
    expect(listSettingsSections()).toEqual([...SETTINGS_SECTION_KEYS]);
  });

  // REQ-023-AC-003：六主题均有稳定 id 与英文展示名。
  test('resolveThemeLabel 为六主题返回英文名称', () => {
    expect(themes.map((theme) => theme.id)).toEqual([
      'midnight',
      'ocean',
      'graphite',
      'sunset',
      'daylight',
      'paper',
    ]);
    expect(resolveThemeLabel('midnight', 'en')).toBe('Midnight');
    expect(resolveThemeLabel('ocean', 'en')).toBe('Ocean');
    expect(resolveThemeLabel('graphite', 'en')).toBe('Graphite');
    expect(resolveThemeLabel('sunset', 'en')).toBe('Sunset');
    expect(resolveThemeLabel('daylight', 'en')).toBe('Daylight');
    expect(resolveThemeLabel('paper', 'en')).toBe('Paper');
  });

  // REQ-023-AC-003：中文 locale 下主题名本地化。
  test('resolveThemeLabel 在 zh 下返回中文主题名', () => {
    expect(resolveThemeLabel('midnight', 'zh')).toBe('午夜');
    expect(resolveThemeLabel('ocean', 'zh')).toBe('深海');
    expect(resolveThemeLabel('graphite', 'zh')).toBe('石墨');
    expect(resolveThemeLabel('sunset', 'zh')).toBe('暮霞');
    expect(resolveThemeLabel('daylight', 'zh')).toBe('日光');
    expect(resolveThemeLabel('paper', 'zh')).toBe('纸墨');
  });
});
