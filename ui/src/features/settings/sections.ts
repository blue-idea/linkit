import { SETTINGS_SECTION_KEYS, type SettingsSectionKey } from '../../config/i18n';

/** 返回 Settings 分区稳定 id 列表（与 i18n 文案解耦）。 */
export function listSettingsSections(): SettingsSectionKey[] {
  return [...SETTINGS_SECTION_KEYS];
}
