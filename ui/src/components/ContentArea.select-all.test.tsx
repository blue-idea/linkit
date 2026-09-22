import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ContentArea } from './ContentArea';
import type { Bookmark } from '../types';

function makeDummyBookmark(overrides: Partial<Bookmark>): Bookmark {
  return {
    id: 'bm-test',
    title: 'Test Bookmark',
    url: 'https://example.com',
    domain: 'example.com',
    favicon: 'E',
    faviconColor: 'blue',
    description: '',
    notes: '',
    tags: [],
    categoryId: '',
    collectionIds: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    lastVisitedAt: null,
    visitCount: 0,
    starred: false,
    pinned: false,
    readStatus: 'unread',
    ...overrides,
  };
}

describe('ContentArea 批量操作栏全选与取消全选 (REQ-011-AC-006)', () => {
  const dummyBookmarks: Bookmark[] = [
    makeDummyBookmark({ id: 'bm-1', title: 'Bookmark One' }),
    makeDummyBookmark({ id: 'bm-2', title: 'Bookmark Two' }),
  ];

  const defaultProps = {
    locale: 'zh' as const,
    bookmarks: dummyBookmarks,
    allBookmarks: dummyBookmarks,
    tags: [],
    categories: [],
    collections: [],
    selection: { kind: 'all' as const },
    filters: {
      query: '',
      tagIds: [],
      onlyStarred: false,
      readStatus: 'all' as const,
      dateRange: 'all' as const,
    },
    density: 'card' as const,
    selectedId: null,
    composeSelectedIds: ['bm-1'],
    sort: 'recent',
    onSort: vi.fn(),
    onDensity: vi.fn(),
    onSearch: vi.fn(),
    onOpenSpotlight: vi.fn(),
    onSelectBookmark: vi.fn(),
    onToggleComposeSelect: vi.fn(),
    onRequestCompose: vi.fn(),
    onToggleStar: vi.fn(),
    onClearTagFilter: vi.fn(),
    onDateRange: vi.fn(),
    onToggleStarredFilter: vi.fn(),
    onReadStatusFilter: vi.fn(),
    onClearFilters: vi.fn(),
    onAcceptAICollection: vi.fn(),
    onDismissAICollection: vi.fn(),
    onNewBookmark: vi.fn(),
    onDragStartBookmark: vi.fn(),
    onOpenAICollection: vi.fn(),
    onOpenDuplicates: vi.fn(),
    onOpenExplore: vi.fn(),
    onVisitBookmark: vi.fn(),
    onEditBookmark: vi.fn(),
    onMoveBookmarks: vi.fn(),
    onDeleteBookmarks: vi.fn(),
    onToggleBookmarkSelection: vi.fn(),
    onClearBookmarkSelection: vi.fn(),
  };

  test('当部分选中时展示全选按钮并触发全选回调', () => {
    const onSelectAll = vi.fn();
    render(
      <ContentArea
        {...defaultProps}
        composeSelectedIds={['bm-1']}
        onSelectAllBookmarks={onSelectAll}
      />
    );

    const selectAllBtn = screen.getByRole('button', { name: '全选' });
    expect(selectAllBtn).toBeInTheDocument();

    fireEvent.click(selectAllBtn);
    expect(onSelectAll).toHaveBeenCalledWith(['bm-1', 'bm-2']);
  });

  test('当全部可视书签均已选中时展示取消全选按钮并触发取消全选回调', () => {
    const onDeselectAll = vi.fn();
    render(
      <ContentArea
        {...defaultProps}
        composeSelectedIds={['bm-1', 'bm-2']}
        onDeselectAllBookmarks={onDeselectAll}
      />
    );

    const deselectAllBtn = screen.getByRole('button', { name: '取消全选' });
    expect(deselectAllBtn).toBeInTheDocument();

    fireEvent.click(deselectAllBtn);
    expect(onDeselectAll).toHaveBeenCalledWith(['bm-1', 'bm-2']);
  });
});
