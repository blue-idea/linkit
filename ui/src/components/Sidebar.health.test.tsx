import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import type { Bookmark } from '../types';

/** 左侧 Link health：扫描入口与正常/更新/失效计数。 */
describe('Sidebar 链接健康扫描入口', () => {
  afterEach(() => {
    cleanup();
  });
  const bookmarks = [
    { id: 'b1', health: 'ok', tags: [] },
    { id: 'b2', health: 'ok', tags: [] },
    { id: 'b3', health: 'changed', tags: [] },
    { id: 'b4', health: 'broken', tags: [] },
  ] as unknown as Bookmark[];

  const baseProps = {
    categories: [],
    collections: [],
    tags: [],
    bookmarks,
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

  test('Link health 标题栏 shall 渲染扫描按钮并打开现有健康扫描', async () => {
    const user = userEvent.setup();
    const onOpenHealth = vi.fn();
    render(<Sidebar {...baseProps} onOpenHealth={onOpenHealth} />);

    expect(screen.getByText('Link health')).toBeInTheDocument();
    const scanButton = screen.getByRole('button', { name: 'Start scan' });
    expect(scanButton).toHaveTextContent('Start scan');
    await user.click(scanButton);
    expect(onOpenHealth).toHaveBeenCalledTimes(1);
  });

  test('Link health shall 在内容更新上方显示正常链接数量', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Sidebar {...baseProps} onSelect={onSelect} onOpenHealth={vi.fn()} />);

    const okRow = screen.getByText((_, element) => (
      element?.getAttribute('data-category-drop') === 'OK'
    ));
    const updatedRow = screen.getByText((_, element) => (
      element?.getAttribute('data-category-drop') === 'Updated'
    ));
    expect(okRow.compareDocumentPosition(updatedRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(okRow).getByText('2')).toBeInTheDocument();

    await user.click(okRow);
    expect(onSelect).toHaveBeenCalledWith({ kind: 'health', status: 'ok' });
  });
});
