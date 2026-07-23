import { describe, expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import type { Category } from '../types';

describe('Sidebar 一级目录拖放落点', () => {
  const categories: Category[] = [
    { id: 'cat-parent', name: '父分类', icon: 'Folder', parentId: null },
    { id: 'cat-child', name: '子分类', icon: 'Folder', parentId: 'cat-parent' },
  ];

  const baseProps = {
    categories,
    collections: [],
    tags: [],
    bookmarks: [],
    selection: { kind: 'all' as const },
    expanded: { 'cat-parent': true },
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

  test('Sidebar 分类区块 shall 渲染 data-category-root-drop 根拖放落点', () => {
    const { container } = render(<Sidebar {...baseProps} />);
    const rootDrop = container.querySelector('[data-category-root-drop="true"]');
    expect(rootDrop).toBeTruthy();
  });
});
