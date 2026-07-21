import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import type { Category, Collection } from '../types';

/**
 * 侧栏分类标签：换行不截断；悬停操作叠在名称末端；+ 与设置图标互换。
 */
describe('Sidebar 分类标签与悬停操作', () => {
  const categories: Category[] = [
    {
      id: 'c-long',
      name: '竞品分析与市场调研资料库',
      icon: 'Folder',
      parentId: null,
      color: 'coral',
    },
  ];
  const collections: Collection[] = [];

  const baseProps = {
    categories,
    collections,
    tags: [],
    bookmarks: [],
    selection: { kind: 'all' as const },
    expanded: {},
    onToggleExpand: vi.fn(),
    onSelect: vi.fn(),
    onDropToCategory: vi.fn(),
    onDropToCollection: vi.fn(),
    onOpenInsights: vi.fn(),
    onNewBookmark: vi.fn(),
    onNewCategory: vi.fn(),
    onRenameCategory: vi.fn(),
    onDeleteCategory: vi.fn(),
    onMoveCategory: vi.fn(),
    onRequestSetCategoryIcon: vi.fn(),
    onNewCollection: vi.fn(),
    onEditCollection: vi.fn(),
    onDeleteCollection: vi.fn(),
    onDropToCompose: vi.fn(),
    insightCount: 0,
  };

  test('分类名称 shall 完整渲染且不使用 truncate 截断', () => {
    render(<Sidebar {...baseProps} />);

    const label = screen.getByText('竞品分析与市场调研资料库');
    expect(label).toBeInTheDocument();
    expect(label.getAttribute('data-nav-label')).toBe('true');
    expect(label.className).not.toMatch(/\btruncate\b/);
    expect(label.className).toMatch(/break-words/);
  });

  test('分类悬停操作区 shall 叠在名称末端且按钮背景透明', () => {
    const { container } = render(<Sidebar {...baseProps} />);

    const actions = container.querySelector('[data-nav-actions="overlay"]');
    expect(actions).toBeTruthy();
    expect(actions?.className).toMatch(/absolute/);

    const buttons = Array.from(actions!.querySelectorAll('button'));
    expect(buttons.length).toBe(4);
    for (const button of buttons) {
      expect(button.className).toMatch(/bg-transparent/);
    }
  });

  test('分类操作按钮顺序 shall 为设置图标、改名、新建子分类、删除', () => {
    const { container } = render(<Sidebar {...baseProps} />);

    const actions = container.querySelector('[data-nav-actions="overlay"]');
    expect(actions).toBeTruthy();
    const labels = Array.from(actions!.querySelectorAll('button')).map(
      (button) => button.getAttribute('aria-label')
    );

    expect(labels).toEqual([
      'Set category icon',
      'Rename category',
      'New subcategory',
      'Delete category',
    ]);
  });

  test('分类悬停操作区 shall 不依赖 group-focus-within，避免展开后父行按钮残留', () => {
    const categoriesWithChild: Category[] = [
      { id: 'c-parent', name: '技术', icon: 'Code2', parentId: null, color: 'blue' },
      { id: 'c-child', name: '前端', icon: 'MonitorSmartphone', parentId: 'c-parent', color: 'blue' },
    ];
    const { container } = render(
      <Sidebar {...baseProps} categories={categoriesWithChild} expanded={{ 'c-parent': true }} />
    );

    const overlays = Array.from(container.querySelectorAll('[data-nav-actions="overlay"]'));
    expect(overlays.length).toBeGreaterThanOrEqual(2);
    for (const overlay of overlays) {
      // 点击展开会聚焦父行按钮；若用 group-focus-within，移到子分类时父行按钮仍会显示。
      expect(overlay.className).not.toMatch(/group-focus-within/);
      expect(overlay.className).toMatch(/group-hover:opacity-100/);
      // 键盘聚焦操作按钮时仍可显示（仅限 overlay 内 focus-visible）。
      expect(overlay.className).toMatch(/has-\[:focus-visible\]:opacity-100|has-\[button:focus-visible\]:opacity-100/);
    }
  });
});
