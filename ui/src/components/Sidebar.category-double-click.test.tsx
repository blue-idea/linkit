import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Category } from '../types';
import { Sidebar } from './Sidebar';

const categories: Category[] = [
  { id: 'parent', name: '技术', icon: 'Code2', parentId: null, color: 'blue' },
  { id: 'child', name: '前端', icon: 'MonitorSmartphone', parentId: 'parent', color: 'blue' },
  { id: 'leaf', name: '阅读收藏', icon: 'BookOpen', parentId: null, color: 'amber' },
];

afterEach(cleanup);

function renderSidebar() {
  const onToggleExpand = vi.fn();
  const onSelect = vi.fn();
  render(
    <Sidebar
      categories={categories}
      collections={[]}
      tags={[]}
      bookmarks={[]}
      selection={{ kind: 'all' }}
      expanded={{ parent: true }}
      onToggleExpand={onToggleExpand}
      onSelect={onSelect}
      onDropToCategory={vi.fn()}
      onDropToCollection={vi.fn()}
      onOpenInsights={vi.fn()}
      onNewBookmark={vi.fn()}
      onNewCategory={vi.fn()}
      onRenameCategory={vi.fn()}
      onDeleteCategory={vi.fn()}
      onMoveCategory={vi.fn()}
      onRequestSetCategoryIcon={vi.fn()}
      onNewCollection={vi.fn()}
      onEditCollection={vi.fn()}
      onDeleteCollection={vi.fn()}
      onDropToCompose={vi.fn()}
      insightCount={0}
    />
  );
  return { onToggleExpand, onSelect };
}

describe('Sidebar 分类名称双击展开', () => {
  // TASK-072 / REQ-010-AC-006：单击名称仍只选择分类，不改变展开状态。
  test('单击父分类名称仅执行选择', async () => {
    const user = userEvent.setup();
    const { onToggleExpand, onSelect } = renderSidebar();

    await user.click(screen.getByText('技术', { exact: true }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith({ kind: 'category', id: 'parent' });
    expect(onToggleExpand).not.toHaveBeenCalled();
  });

  // TASK-072 / REQ-010-AC-006：双击名称只切换一次展开状态。
  test('双击有子分类的名称执行一次展开切换', async () => {
    const user = userEvent.setup();
    const { onToggleExpand } = renderSidebar();

    await user.dblClick(screen.getByText('技术', { exact: true }));

    expect(onToggleExpand).toHaveBeenCalledOnce();
    expect(onToggleExpand).toHaveBeenCalledWith('parent', true);
  });

  // TASK-072 / REQ-010-AC-006：叶子分类没有可展开内容，双击不得产生切换。
  test('双击叶子分类名称不执行展开切换', async () => {
    const user = userEvent.setup();
    const { onToggleExpand } = renderSidebar();

    await user.dblClick(screen.getByText('阅读收藏', { exact: true }));

    expect(onToggleExpand).not.toHaveBeenCalled();
  });
});
