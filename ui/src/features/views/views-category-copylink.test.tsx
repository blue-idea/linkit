import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { CardView } from './CardView';
import { ListView } from './ListView';
import { CompactRow } from './CompactRow';
import type { BookmarkPresentation } from './presenter';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 100,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 100,
        size: 100,
      })),
    measureElement: () => {},
  }),
}));

const mockBookmarkPresentation: BookmarkPresentation = {
  id: 'bm-test-1',
  title: 'React 官方网站',
  url: 'https://react.dev',
  categoryId: 'c-fe',
  categoryName: 'Frontend',
  domain: 'react.dev',
  description: 'The library for web and native user interfaces',
  summary: 'React 是一套构建界面的声明式库',
  tags: [{ id: 't-1', label: 'Web', color: 'blue' }],
  starred: true,
  pinned: false,
  health: 'ok',
  visitCount: 42,
  createdAt: '2026-07-01T00:00:00.000Z',
  thumbnail: null,
  favicon: 'R',
  faviconColor: 'blue',
};


describe('列表视图分类名称与复制链接集成', () => {
  afterEach(() => cleanup());

  test('CardView 条目在操作行左对齐渲染最近一级分类名称与复制链接按钮', async () => {
    render(
      <CardView
        items={[mockBookmarkPresentation]}
        isSelected={() => false}
        isBulkSelected={() => false}
        selectionMode={false}
        onSelect={vi.fn()}
        onToggleStar={vi.fn()}
        onDragStart={vi.fn()}
        onVisit={vi.fn()}
        onEdit={vi.fn()}
        onMove={vi.fn()}
        onDelete={vi.fn()}
        onToggleSelect={vi.fn()}
      />
    );

    // 验证分类名称显示
    expect(screen.getByTestId('bookmark-category-name')).toHaveTextContent('Frontend');
    // 验证复制链接按钮存在
    const copyButton = screen.getByRole('button', { name: 'Copy link' });
    expect(copyButton).toBeInTheDocument();
  });

  test('ListView 条目在操作行左对齐渲染最近一级分类名称与复制链接按钮', () => {
    render(
      <ListView
        items={[mockBookmarkPresentation]}
        isSelected={() => false}
        isBulkSelected={() => false}
        selectionMode={false}
        onSelect={vi.fn()}
        onToggleStar={vi.fn()}
        onDragStart={vi.fn()}
        onVisit={vi.fn()}
        onEdit={vi.fn()}
        onMove={vi.fn()}
        onDelete={vi.fn()}
        onToggleSelect={vi.fn()}
      />
    );

    expect(screen.getByTestId('bookmark-category-name')).toHaveTextContent('Frontend');
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();

    // 验证五角星按钮与标题处于同一主信息行容器中
    const starBtn = screen.getByRole('button', { name: 'Unstar React 官方网站' });
    expect(starBtn).toBeInTheDocument();
    const titleElement = screen.getByText('React 官方网站');
    // 五角星按钮与标题同属于第一行 flex 容器
    expect(starBtn.parentElement).toBe(titleElement.closest('.flex.items-center.gap-3'));
  });

  test('CompactRow 在操作行左对齐渲染最近一级分类名称与复制链接按钮', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(
      <CompactRow
        view="timeline"
        item={mockBookmarkPresentation}
        selected={false}
        selectionMode={false}
        isBulkSelected={() => false}
        onClick={vi.fn()}
        onDragStart={vi.fn()}
        onVisit={vi.fn()}
        onEdit={vi.fn()}
        onMove={vi.fn()}
        onDelete={vi.fn()}
        onToggleSelect={vi.fn()}
      />
    );

    expect(screen.getByTestId('bookmark-category-name')).toHaveTextContent('Frontend');
    const copyBtn = screen.getByRole('button', { name: 'Copy link' });
    // 验证按钮只显示图标，不包含任何文本
    expect(copyBtn.textContent).toBe('');
    await user.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('https://react.dev');
    // 状态切换为已复制反馈（title 提示 Copied）
    expect(copyBtn).toHaveAttribute('title', 'Copied');
    expect(copyBtn.querySelector('svg.lucide-check')).toBeTruthy();
  });
});

