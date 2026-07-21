import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import type { Category, Collection } from '../types';

/**
 * fix_task 1.7 / REQ-010-AC-002 / REQ-012-AC-001
 * 侧栏分类与主题应提供改名入口。
 */
describe('Sidebar 改名入口', () => {
  const categories: Category[] = [
    { id: 'c1', name: 'Design', icon: 'Folder', parentId: null, color: 'blue' },
  ];
  const collections: Collection[] = [
    {
      id: 'col1',
      name: 'Inspiration',
      emoji: '✨',
      color: 'violet',
      description: '',
      bookmarkIds: [],
    },
  ];

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

  test('分类行悬停操作区 shall 提供 Rename category 按钮并回调', async () => {
    const user = userEvent.setup();
    const onRenameCategory = vi.fn();

    render(<Sidebar {...baseProps} onRenameCategory={onRenameCategory} />);

    const renameButton = screen.getByRole('button', { name: 'Rename category' });
    expect(renameButton).toBeInTheDocument();
    await user.click(renameButton);
    expect(onRenameCategory).toHaveBeenCalledWith('c1');
  });

  test('主题行悬停操作区 shall 暴露 Edit collection 改名入口', () => {
    render(<Sidebar {...baseProps} />);

    // 主题改名入口为侧栏悬停 Edit collection（完整编辑对话框含名称字段）。
    expect(screen.getAllByRole('button', { name: 'Edit collection' }).length).toBeGreaterThan(0);
  });
});
