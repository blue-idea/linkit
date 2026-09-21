import { describe, expect, test } from 'vitest';
import { SETTINGS_SECTION_KEYS } from '../../config/i18n';
import { themes } from '../../themes';
import { listSettingsSections } from './sections';
import { resolveThemeLabel } from './themes';

describe('设置 UI 规格', () => {
  // REQ-023-AC-001：打开 Settings 时可发现五个分区。
  test('listSettingsSections 暴露六个稳定分区 id', () => {
    expect(listSettingsSections()).toEqual([...SETTINGS_SECTION_KEYS]);
  });

  // REQ-023-AC-003：十主题均有稳定 id 与英文展示名。
  test('resolveThemeLabel 为十主题返回英文名称', () => {
    expect(themes.map((theme) => theme.id)).toEqual([
      'midnight',
      'ocean',
      'graphite',
      'sunset',
      'daylight',
      'paper',
      'cupertino',
      'sequoia',
      'obsidian',
      'aurora',
    ]);
    expect(resolveThemeLabel('midnight', 'en')).toBe('Midnight');
    expect(resolveThemeLabel('ocean', 'en')).toBe('Ocean');
    expect(resolveThemeLabel('graphite', 'en')).toBe('Graphite');
    expect(resolveThemeLabel('sunset', 'en')).toBe('Sunset');
    expect(resolveThemeLabel('daylight', 'en')).toBe('Daylight');
    expect(resolveThemeLabel('paper', 'en')).toBe('Paper');
    expect(resolveThemeLabel('cupertino', 'en')).toBe('Cupertino');
    expect(resolveThemeLabel('sequoia', 'en')).toBe('Sequoia');
    expect(resolveThemeLabel('obsidian', 'en')).toBe('Obsidian');
    expect(resolveThemeLabel('aurora', 'en')).toBe('Aurora');
  });

  // REQ-023-AC-003：中文 locale 下主题名本地化。
  test('resolveThemeLabel 在 zh 下返回中文主题名', () => {
    expect(resolveThemeLabel('midnight', 'zh')).toBe('午夜');
    expect(resolveThemeLabel('ocean', 'zh')).toBe('深海');
    expect(resolveThemeLabel('graphite', 'zh')).toBe('石墨');
    expect(resolveThemeLabel('sunset', 'zh')).toBe('暮霞');
    expect(resolveThemeLabel('daylight', 'zh')).toBe('日光');
    expect(resolveThemeLabel('paper', 'zh')).toBe('纸墨');
    expect(resolveThemeLabel('cupertino', 'zh')).toBe('库比蒂诺');
    expect(resolveThemeLabel('sequoia', 'zh')).toBe('红杉自然');
    expect(resolveThemeLabel('obsidian', 'zh')).toBe('黑曜石');
    expect(resolveThemeLabel('aurora', 'zh')).toBe('极光之夜');
  });
});
