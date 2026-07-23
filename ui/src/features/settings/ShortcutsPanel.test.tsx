import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShortcutsPanel } from './ShortcutsPanel';
import { DEFAULT_SHORTCUTS } from '../shell/shortcuts';

afterEach(() => {
  cleanup();
});

describe('ShortcutsPanel', () => {
  // REQ-030-AC-006
  test('列出全部可配置快捷键', () => {
    render(
      <ShortcutsPanel shortcuts={DEFAULT_SHORTCUTS} locale="en" onChange={() => undefined} />,
    );
    expect(screen.getByRole('button', { name: /Spotlight search shortcut/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Toggle left sidebar shortcut/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Toggle right sidebar shortcut/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show \/ hide window shortcut/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Restore Defaults/i })).toBeInTheDocument();
  });

  // REQ-030-AC-009
  test('恢复默认会回调默认映射', async () => {
    const user = userEvent.setup();
    let next = { ...DEFAULT_SHORTCUTS, insights: 'CmdOrCtrl+J' };
    render(
      <ShortcutsPanel
        shortcuts={next}
        locale="en"
        onChange={(value) => {
          next = value;
        }}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Restore Defaults/i }));
    expect(next).toEqual(DEFAULT_SHORTCUTS);
  });

  test('在 macOS 环境下正确显示 ⌘ 等 Mac 风格快捷键', () => {
    const originalPlatform = navigator.platform;
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      configurable: true,
    });

    render(
      <ShortcutsPanel shortcuts={DEFAULT_SHORTCUTS} locale="en" onChange={() => undefined} />,
    );

    const button = screen.getByRole('button', { name: /Spotlight search shortcut/i });
    expect(button.textContent).toContain('⌘');

    Object.defineProperty(navigator, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });
});

