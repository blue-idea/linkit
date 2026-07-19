import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import {
  AICollectionGoalDialog,
  AICollectionPreviewDialog,
  DuplicatePreviewDialog,
} from './OrganizerDialogs';

describe('AI 整理对话框', () => {
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
      targetId: 'b-1', duplicateId: 'b-2', reason: 'Exact URL match',
      differences: [{ field: 'title', target: 'React', duplicate: 'React Copy' }],
    }} onDecision={onDecision} />);
    const dialog = screen.getByRole('dialog', { name: 'Duplicate bookmark preview' });
    expect(within(dialog).getByText('Exact URL match')).toBeInTheDocument();
    expect(within(dialog).getByText('React Copy')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Merge' }));
    expect(onDecision).toHaveBeenCalledWith('merge');
    expect(within(dialog).getByRole('button', { name: 'Delete duplicate' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
