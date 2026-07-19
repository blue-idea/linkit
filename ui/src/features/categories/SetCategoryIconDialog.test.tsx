import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetCategoryIconDialog } from './SetCategoryIconDialog';
import { listCategoryIconCandidates } from '../../domain/categories';

describe('SetCategoryIconDialog', () => {
  // fix_task 1.2：候选图标与颜色可选中，Save 后回调。
  test('渲染候选图标与颜色并在 Save 后回调 onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const candidates = listCategoryIconCandidates();
    const target = candidates.find((icon) => icon !== 'Folder') ?? candidates[0];

    render(
      <SetCategoryIconDialog
        categoryName="Design"
        currentIcon="Folder"
        currentColor="gray"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('heading', { name: 'Set category icon' })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Category icon candidates' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Category icon color' })).toBeInTheDocument();
    expect(candidates.length).toBeGreaterThan(40);

    for (const icon of candidates.slice(0, 4)) {
      expect(screen.getByRole('option', { name: `Icon ${icon}` })).toBeInTheDocument();
    }

    await user.click(screen.getByRole('option', { name: `Icon ${target}` }));
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Color coral' }));
    await user.click(screen.getByRole('button', { name: 'Save category icon' }));
    expect(onConfirm).toHaveBeenCalledWith({ icon: target, color: 'coral' });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
