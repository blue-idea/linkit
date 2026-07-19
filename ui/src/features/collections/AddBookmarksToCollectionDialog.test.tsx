import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { AddBookmarksToCollectionDialog } from './AddBookmarksToCollectionDialog';

const bookmarks = [
  {
    id: 'bm-member',
    title: 'Already Member',
    url: 'https://example.test/member',
    collectionIds: ['col-target'],
  },
  {
    id: 'bm-react',
    title: 'React Docs',
    url: 'https://react.dev/learn',
    collectionIds: [],
  },
  {
    id: 'bm-vue',
    title: 'Vue Guide',
    url: 'https://vuejs.org/guide',
    collectionIds: [],
  },
];

describe('AddBookmarksToCollectionDialog', () => {
  afterEach(() => cleanup());

  // REQ-012-AC-007：挑选器仅列出非成员，并支持搜索多选。
  test('[组件] 挑选器 shall 排除已成员并支持搜索多选', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <AddBookmarksToCollectionDialog
        collectionId="col-target"
        collectionName="Weekend reads"
        bookmarks={bookmarks}
        onCancel={() => {}}
        onConfirm={onConfirm}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Add bookmarks' });
    expect(within(dialog).queryByText('Already Member')).toBeNull();
    expect(within(dialog).getByText('React Docs')).toBeVisible();
    expect(within(dialog).getByText('Vue Guide')).toBeVisible();

    await user.type(screen.getByLabelText('Search bookmarks'), 'REACT');
    expect(within(dialog).getByText('React Docs')).toBeVisible();
    expect(within(dialog).queryByText('Vue Guide')).toBeNull();

    await user.click(screen.getByRole('checkbox', { name: 'Select React Docs' }));
    expect(screen.getByRole('button', { name: 'Confirm add bookmarks' })).toBeEnabled();
  });

  // REQ-012-AC-008 / AC-009：未选中时 Confirm 禁用；Cancel 零副作用。
  test('[组件] 挑选器 shall 在未选中时禁用确认且取消不提交', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <AddBookmarksToCollectionDialog
        collectionId="col-target"
        collectionName="Weekend reads"
        bookmarks={bookmarks}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('button', { name: 'Confirm add bookmarks' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Cancel add bookmarks' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // REQ-012-AC-008：确认后仅提交所选 ID。
  test('[组件] 挑选器确认 shall 仅提交选中的书签 ID', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <AddBookmarksToCollectionDialog
        collectionId="col-target"
        collectionName="Weekend reads"
        bookmarks={bookmarks}
        onCancel={() => {}}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Select Vue Guide' }));
    await user.click(screen.getByRole('button', { name: 'Confirm add bookmarks' }));
    expect(onConfirm).toHaveBeenCalledWith(['bm-vue']);
  });
});
