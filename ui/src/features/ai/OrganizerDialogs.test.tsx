import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  AICollectionGoalDialog,
  AICollectionPreviewDialog,
  DuplicatePairsDialog,
  DuplicatePreviewDialog,
} from './OrganizerDialogs';

describe('AI 整理对话框', () => {
  afterEach(() => {
    cleanup();
  });
  test('目标输入对话框 shall 空目标禁用提交且确认时回传 trim 后的描述', () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    render(<AICollectionGoalDialog onCancel={onCancel} onSubmit={onSubmit} />);

    const dialog = screen.getByRole('dialog', { name: 'AI create collection' });
    expect(within(dialog).getByText(/Describe the collection you want/)).toBeInTheDocument();
    const submit = within(dialog).getByRole('button', { name: 'Generate preview' });
    expect(submit).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText('Collection goal'), {
      target: { value: '  Build a frontend research collection  ' },
    });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith('Build a frontend research collection');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  test('主题预览允许编辑并仅在确认时提交选中成员', () => {
    const onConfirm = vi.fn();
    render(<AICollectionPreviewDialog preview={{
      name: 'Frontend Research', description: 'Reading list', suggestedTags: ['frontend'],
      bookmarkIds: ['b-1', 'b-2'],
    }} bookmarks={[{ id: 'b-1', title: 'React' }, { id: 'b-2', title: 'CSS' }]}
    onCancel={() => {}} onConfirm={onConfirm} />);

    fireEvent.change(screen.getByLabelText('Collection name'), { target: { value: 'Edited collection' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'CSS' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create collection' }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Edited collection', acceptedBookmarkIds: ['b-1'],
    }));
  });

  test('重复预览展示依据和差异并提供三个明确动作', () => {
    const onDecision = vi.fn();
    render(<DuplicatePreviewDialog preview={{
      targetId: 'b-1', duplicateId: 'b-2', reason: { kind: 'exact_url' },
      differences: [{ field: 'title', target: 'React', duplicate: 'React Copy' }],
      targetTitle: 'React', duplicateTitle: 'React Copy',
    }} onDecision={onDecision} />);
    const dialog = screen.getByRole('dialog', { name: 'Duplicate bookmark preview' });
    expect(within(dialog).getByText('Exact URL match')).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'Keep React Copy' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Merge' }));
    expect(onDecision).toHaveBeenCalledWith({
      action: 'merge', targetId: 'b-1', duplicateId: 'b-2',
    });
    expect(within(dialog).getByRole('button', { name: 'Delete duplicate' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  test('重复预览 shall 允许切换保留侧后再合并或删除', () => {
    const onDecision = vi.fn();
    render(<DuplicatePreviewDialog preview={{
      targetId: 'b-1', duplicateId: 'b-2', reason: { kind: 'same_domain', domain: 'vitejs.dev' },
      differences: [{ field: 'title', target: 'Keep Me', duplicate: 'Drop Me' }],
      targetTitle: 'Keep Me', duplicateTitle: 'Drop Me',
    }} onDecision={onDecision} />);
    const dialog = screen.getByRole('dialog', { name: 'Duplicate bookmark preview' });
    expect(within(dialog).getByText('Same domain: vitejs.dev')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Keep Drop Me' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete duplicate' }));
    expect(onDecision).toHaveBeenCalledWith({
      action: 'delete', targetId: 'b-2', duplicateId: 'b-1',
    });
  });

  // REQ-020-AC-005：列表展示重复对数，并支持逐项选择
  test('重复候选列表 shall 显示对数并在选择时回传对应候选对', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<DuplicatePairsDialog
      pairs={[
        {
          targetId: 'a', duplicateId: 'b', reason: { kind: 'exact_url' },
          targetTitle: 'Coolors', duplicateTitle: 'Coolors Copy',
        },
        {
          targetId: 'c', duplicateId: 'd', reason: { kind: 'same_domain', domain: 'vitejs.dev' },
          targetTitle: 'Vite Docs', duplicateTitle: 'Vite Home',
        },
      ]}
      onSelect={onSelect}
      onClose={onClose}
      onBatchAction={vi.fn()}
    />);
    const dialog = screen.getByRole('dialog', { name: 'Duplicate pairs' });
    expect(within(dialog).getByTestId('duplicate-pair-count')).toHaveTextContent('2 duplicate pairs found');
    const coolorsRow = within(dialog).getByRole('button', { name: 'Review Coolors and Coolors Copy' });
    expect(coolorsRow).toHaveTextContent(/Coolors/);
    expect(coolorsRow).toHaveTextContent(/Coolors Copy/);
    // 冲突书签分行展示，避免挤在同一行
    expect(coolorsRow.querySelector('[data-testid="duplicate-pair-titles"]')?.childElementCount).toBe(2);
    fireEvent.click(coolorsRow);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ targetId: 'a', duplicateId: 'b' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  // REQ-020-AC-007：勾选批量与全部处理
  test('重复候选列表 shall 支持勾选批量与 Merge all', () => {
    const onBatchAction = vi.fn();
    render(<DuplicatePairsDialog
      pairs={[
        {
          targetId: 'a', duplicateId: 'b', reason: { kind: 'exact_url' },
          targetTitle: 'Coolors', duplicateTitle: 'Coolors Copy',
        },
        {
          targetId: 'c', duplicateId: 'd', reason: { kind: 'same_domain', domain: 'vitejs.dev' },
          targetTitle: 'Vite Home', duplicateTitle: 'Vite Docs',
        },
      ]}
      onSelect={vi.fn()}
      onClose={vi.fn()}
      onBatchAction={onBatchAction}
    />);
    const dialog = screen.getByRole('dialog', { name: 'Duplicate pairs' });
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Select Coolors and Coolors Copy' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Merge selected' }));
    expect(onBatchAction).toHaveBeenCalledWith({
      action: 'merge',
      pairs: [expect.objectContaining({ targetId: 'a', duplicateId: 'b' })],
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete all' }));
    expect(onBatchAction).toHaveBeenCalledWith({
      action: 'delete',
      pairs: [
        expect.objectContaining({ targetId: 'a', duplicateId: 'b' }),
        expect.objectContaining({ targetId: 'c', duplicateId: 'd' }),
      ],
    });
  });
});
