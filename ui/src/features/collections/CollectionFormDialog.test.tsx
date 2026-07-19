import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { CollectionFormDialog } from './CollectionFormDialog';

describe('CollectionFormDialog', () => {
  afterEach(() => cleanup());

  // REQ-012-AC-005：新建主题时应通过候选菜单选择 Emoji 图标。
  test('[组件] 新建 Collection shall 从候选图标菜单选择 Emoji 并提交', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <CollectionFormDialog
        mode="create"
        onCancel={() => {}}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText('Collection name'), 'Launch plan');
    await user.click(screen.getByRole('button', { name: 'Choose collection icon' }));
    await expect(screen.findByRole('menu', { name: 'Collection icon options' })).resolves.toBeVisible();
    await user.click(screen.getByRole('menuitemradio', { name: 'Rocket' }));
    await user.click(screen.getByRole('button', { name: 'Create collection' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Launch plan',
        emoji: '🚀',
      })
    );
  });

  // REQ-012-AC-005：编辑主题时选择候选图标，但保存前不提交变更。
  test('[组件] 编辑 Collection shall 仅在 Save 后提交所选候选 Emoji', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <CollectionFormDialog
        mode="edit"
        initial={{
          name: 'Reading',
          emoji: '📚',
          color: 'green',
          description: 'Long-form reads',
        }}
        onCancel={() => {}}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Choose collection icon' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Target' }));
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Save collection' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Reading',
        emoji: '🎯',
      })
    );
  });
});
