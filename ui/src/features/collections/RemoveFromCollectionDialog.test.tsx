import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { RemoveFromCollectionDialog } from './RemoveFromCollectionDialog';

describe('RemoveFromCollectionDialog', () => {
  afterEach(() => cleanup());

  // REQ-012-AC-011：多选移出确认前零副作用。
  test('[组件] Cancel shall 不调用确认回调', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <RemoveFromCollectionDialog
        count={2}
        collectionName="Weekend reads"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel remove from collection' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // REQ-012-AC-011：确认后才移出。
  test('[组件] Confirm shall 调用确认回调', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <RemoveFromCollectionDialog
        count={2}
        collectionName="Weekend reads"
        onCancel={() => {}}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Confirm remove from collection' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
