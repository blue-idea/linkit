import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { AppShell } from './AppShell';

const chrome = {
  onSpotlight: () => {},
  onNew: () => {},
  onSettings: () => {},
  user: null,
  storageMode: 'local',
  sidebarOpen: true,
  detailOpen: true,
  onToggleSidebar: () => {},
  onToggleDetail: () => {},
} as const;

describe('AppShell 响应式布局', () => {
  // REQ-024-AC-001：主窗口壳体必须填满父容器，不得固定最大宽高。
  test('窗口扩大时主壳体保持全宽全高且没有最大尺寸上限', () => {
    render(
      <AppShell
        chrome={chrome}
        sidebar={<div>Sidebar</div>}
        content={<div>Content</div>}
        detail={<div>Detail</div>}
        sidebarOpen
        detailOpen
      />
    );

    const shell = screen.getByRole('banner', { name: 'Top bar' }).parentElement;

    expect(shell).not.toBeNull();
    expect(shell).toHaveClass('w-full', 'h-full');
    expect(shell).not.toHaveClass('md:max-w-[1400px]', 'md:max-h-[880px]');
  });
});
