import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import type { Tag } from '../types';

/**
 * REQ-014-AC-004 / REQ-014-AC-005
 * 侧栏标签的新建与删除功能测试
 */
describe('Sidebar 标签新建与删除功能', () => {
  const tags: Tag[] = [
    { id: 't1', label: 'Design', color: 'blue' },
    { id: 't2', label: 'Frontend', color: 'green' },
  ];

  const baseProps = {
    categories: [],
    collections: [],
    tags,
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

  test('标签标题栏右侧应渲染新建标签按钮，点击时触发 onNewTag 回调', async () => {
    const user = userEvent.setup();
    const onNewTag = vi.fn();

    render(<Sidebar {...baseProps} onNewTag={onNewTag} />);

    const newTagButton = screen.getByRole('button', { name: 'New tag' });
    expect(newTagButton).toBeInTheDocument();

    await user.click(newTagButton);
    expect(onNewTag).toHaveBeenCalledTimes(1);
  });

  test('传入 onDeleteTag 时 TagPill 应渲染删除按钮，点击时触发 onDeleteTag 回调', async () => {
    const user = userEvent.setup();
    const onDeleteTag = vi.fn();

    render(<Sidebar {...baseProps} onDeleteTag={onDeleteTag} />);

    const removeButtons = screen.getAllByRole('button', { name: /Remove tag/i });
    expect(removeButtons.length).toBe(2);

    await user.click(removeButtons[0]);
    expect(onDeleteTag).toHaveBeenCalledWith('t1');
  });
});
