import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { I18nProvider, useI18n } from './use-i18n';

function Probe({ customTitle }: { customTitle: string }) {
  const i18n = useI18n();
  return (
    <div>
      <span>{i18n.t('settings.title')}</span>
      <span>{customTitle}</span>
    </div>
  );
}

describe('I18nProvider', () => {
  // REQ-023-AC-008：系统 UI 跟随 locale，用户自定义内容保持原样。
  test('locale 更新时刷新系统文案但不改写自定义内容', () => {
    const customTitle = 'Coolors — 超快配色方案生成器';
    const view = render(
      <I18nProvider locale="en">
        <Probe customTitle={customTitle} />
      </I18nProvider>,
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText(customTitle)).toBeInTheDocument();

    view.rerender(
      <I18nProvider locale="zh">
        <Probe customTitle={customTitle} />
      </I18nProvider>,
    );

    expect(screen.getByText('设置')).toBeInTheDocument();
    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });
});
