import { describe, it, expect, vi } from 'vitest';
import { buildCategoryTree } from '../categories/utils';
import type { Category } from '../../types';

describe('buildCategoryTree', () => {
  it('应该正确构建带有深度层级关系的分类列表并保持父子遍历顺序', () => {
    const mockCategories: Category[] = [
      { id: 'cat-1', name: 'Parent 1', icon: 'Folder', parentId: null },
      { id: 'cat-1-1', name: 'Child 1-1', icon: 'Folder', parentId: 'cat-1' },
      { id: 'cat-2', name: 'Parent 2', icon: 'Folder', parentId: null },
      { id: 'cat-1-2', name: 'Child 1-2', icon: 'Folder', parentId: 'cat-1' },
      { id: 'cat-1-1-1', name: 'Child 1-1-1', icon: 'Folder', parentId: 'cat-1-1' },
    ];

    const result = buildCategoryTree(mockCategories);

    expect(result).toEqual([
      { id: 'cat-1', name: 'Parent 1', level: 0 },
      { id: 'cat-1-1', name: 'Child 1-1', level: 1 },
      { id: 'cat-1-1-1', name: 'Child 1-1-1', level: 2 },
      { id: 'cat-1-2', name: 'Child 1-2', level: 1 },
      { id: 'cat-2', name: 'Parent 2', level: 0 },
    ]);
  });

  it('应该能够正确处理带循环引用或无主父分类的孤儿节点', () => {
    const mockCategories: Category[] = [
      { id: 'cat-orphan', name: 'Orphan Category', icon: 'Folder', parentId: 'non-existing' },
    ];

    const result = buildCategoryTree(mockCategories);

    expect(result).toEqual([
      { id: 'cat-orphan', name: 'Orphan Category', level: 0 },
    ]);
  });
});

describe('BookmarkMoveDialog', () => {
  const mockCategories: Category[] = [
    { id: 'cat-1', name: 'Design', icon: 'Folder', parentId: null },
    { id: 'cat-2', name: 'Dev', icon: 'Folder', parentId: null },
  ];

  it('移动书签弹窗应正常展示目标分类下拉组件并在选择后触发移动确认', async () => {
    const { render, screen } = await import('@testing-library/react');
    const { default: userEvent } = await import('@testing-library/user-event');
    const { BookmarkMoveDialog } = await import('./BookmarkActionDialogs');
    const onMove = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <BookmarkMoveDialog
        open={true}
        count={2}
        categories={mockCategories}
        onClose={onClose}
        onMove={onMove}
      />
    );

    // 默认打开目标分类下拉并选择 Dev
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    const devOption = await screen.findByRole('option', { name: /Dev/i });
    await user.click(devOption);

    // 点击确认移动
    const confirmButton = screen.getByRole('button', { name: /Move bookmarks|移动书签/i });
    await user.click(confirmButton);

    expect(onMove).toHaveBeenCalledWith('cat-2');
  });
});

