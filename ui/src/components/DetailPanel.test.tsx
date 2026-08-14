import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DetailPanel } from './DetailPanel';
import type { Bookmark } from '../types';

const bookmark: Bookmark = {
  id: 'bookmark-react',
  title: 'React Documentation',
  url: 'https://react.dev',
  domain: 'react.dev',
  favicon: 'R',
  faviconColor: 'blue',
  description: 'Official React documentation.',
  notes: '',
  tags: [],
  categoryId: 'cat-docs',
  collectionIds: [],
  createdAt: '2026-08-14T08:00:00.000Z',
  lastVisitedAt: null,
  visitCount: 0,
  starred: false,
  pinned: false,
  readStatus: 'unread',
  health: 'ok',
  aiSummary: 'Original AI summary.',
};

const baseProps = {
  bookmark,
  tags: [],
  categories: [{ id: 'cat-docs', name: 'Docs', icon: 'BookOpen', parentId: null, color: 'blue' as const }],
  collections: [],
  onUpdate: vi.fn(),
  onToggleStar: vi.fn(),
  onTogglePin: vi.fn(),
  onToggleCollection: vi.fn(),
  onAddTag: vi.fn(),
  onRemoveTag: vi.fn(),
  onAcceptSuggestedTag: vi.fn(),
  onCreateTag: vi.fn(),
  onVisit: vi.fn(),
  onOpenHealth: vi.fn(),
  onClose: vi.fn(),
};

describe('DetailPanel AI summary', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test('右侧栏 AI 摘要允许编辑并在失焦时保存', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<DetailPanel {...baseProps} onUpdate={onUpdate} />);

    const summaryInput = screen.getByRole('textbox', { name: 'AI summary' });
    expect(summaryInput).toHaveValue('Original AI summary.');

    await user.clear(summaryInput);
    await user.type(summaryInput, 'User edited summary.');
    await user.tab();

    expect(onUpdate).toHaveBeenCalledWith({ aiSummary: 'User edited summary.' });
  });

  test('切换书签时同步当前书签的 AI 摘要', () => {
    const nextBookmark: Bookmark = {
      ...bookmark,
      id: 'bookmark-vite',
      title: 'Vite Documentation',
      aiSummary: 'Next bookmark summary.',
    };
    const { rerender } = render(<DetailPanel {...baseProps} />);

    rerender(<DetailPanel {...baseProps} bookmark={nextBookmark} />);

    expect(screen.getByRole('textbox', { name: 'AI summary' })).toHaveValue('Next bookmark summary.');
  });

  test('无 AI 摘要的书签也允许在右侧栏新增摘要', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<DetailPanel {...baseProps} bookmark={{ ...bookmark, aiSummary: undefined }} onUpdate={onUpdate} />);

    const summaryInput = screen.getByRole('textbox', { name: 'AI summary' });
    expect(summaryInput).toHaveValue('');

    await user.type(summaryInput, 'Manual summary.');
    await user.tab();

    expect(onUpdate).toHaveBeenCalledWith({ aiSummary: 'Manual summary.' });
  });
});
