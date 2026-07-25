import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagFormDialog, DeleteTagDialog } from './Dialogs';

describe('TagFormDialog 与 DeleteTagDialog 组件测试', () => {
  test('TagFormDialog 渲染、填写入参并提交新建标签', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<TagFormDialog onCancel={onCancel} onSubmit={onSubmit} />);

    expect(screen.getByRole('dialog', { name: 'New tag' })).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Enter tag name…');
    await user.type(input, 'React');

    const greenColorBtn = screen.getByRole('button', { name: 'Color green' });
    await user.click(greenColorBtn);

    const submitBtn = screen.getByRole('button', { name: 'New tag' });
    await user.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({ label: 'React', color: 'green' });
  });

  test('DeleteTagDialog 渲染二次确认信息并支持确认与取消', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(<DeleteTagDialog name="Design" onCancel={onCancel} onConfirm={onConfirm} />);

    expect(screen.getByRole('dialog', { name: 'Delete tag' })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete tag “Design”?/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Delete tag' });
    await user.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
