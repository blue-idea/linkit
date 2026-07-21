import { describe, expect, test } from 'vitest';
import { createCoreJourneySeed } from '../../testing/factories';
import { createI18n } from '../../i18n';
import { buildLibraryInsights } from './index';

describe('洞察报告文案国际化', () => {
  test('卡片标题与说明随 locale 切换', () => {
    const insights = buildLibraryInsights(createCoreJourneySeed().library.data);
    const en = createI18n('en');
    const zh = createI18n('zh');
    const sample = insights.find(({ action }) => action.type === 'collection');
    expect(sample).toBeDefined();
    if (!sample) return;
    expect(en.t(sample.titleKey, sample.titleParams)).toMatch(/largest theme/i);
    expect(zh.t(sample.titleKey, sample.titleParams)).toMatch(/最大主题/);
    expect(zh.t(sample.detailKey, sample.detailParams)).toMatch(/打开该主题/);
  });
});
