import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { CategorySelect } from './CategorySelect';
import type { Category } from '../../types';

describe('CategorySelect', () => {
  afterEach(() => cleanup());

  const mockCategories: Category[] = [
    { id: 'cat-1', name: 'Work', icon: 'Folder', parentId: null },
    { id: 'cat-1-1', name: 'Projects', icon: 'Folder', parentId: 'cat-1' },
    { id: 'cat-2', name: 'Life', icon: 'Folder', parentId: null },
  ];

  test('默认未分类状态下正确渲染触发器，并在点击时展开选项菜单', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <CategorySelect
        ariaLabel="目标分类"
        value=""
        onChange={onChange}
        categories={mockCategories}
      />
    );

    const trigger = screen.getByRole('combobox', { name: '目标分类' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent(/uncategorized|未分类/i);

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const listbox = await screen.findByRole('listbox');
    expect(listbox).toBeInTheDocument();

    // 包含未分类选项与所有分类节点
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent(/uncategorized|未分类/i);
    expect(options[1]).toHaveTextContent('Work');
    expect(options[2]).toHaveTextContent('Projects');
    expect(options[3]).toHaveTextContent('Life');
  });

  test('点击某个分类选项时触发 onChange 并自动收起下拉菜单', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <CategorySelect
        ariaLabel="目标分类"
        value=""
        onChange={onChange}
        categories={mockCategories}
      />
    );

    const trigger = screen.getByRole('combobox', { name: '目标分类' });
    await user.click(trigger);

    const targetOption = screen.getByRole('option', { name: /Projects/i });
    await user.click(targetOption);

    expect(onChange).toHaveBeenCalledWith('cat-1-1');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  test('按下 Escape 键时能够收起下拉菜单', async () => {
    const user = userEvent.setup();

    render(
      <CategorySelect
        ariaLabel="目标分类"
        value="cat-1"
        onChange={() => {}}
        categories={mockCategories}
      />
    );

    const trigger = screen.getByRole('combobox', { name: '目标分类' });
    await user.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  test('当已选中分类时，触发器显示对应分类名称，并在列表中标识 aria-selected', async () => {
    const user = userEvent.setup();

    render(
      <CategorySelect
        ariaLabel="目标分类"
        value="cat-1"
        onChange={() => {}}
        categories={mockCategories}
      />
    );

    const trigger = screen.getByRole('combobox', { name: '目标分类' });
    expect(trigger).toHaveTextContent('Work');

    await user.click(trigger);
    const selectedOption = screen.getByRole('option', { name: /Work/i });
    expect(selectedOption).toHaveAttribute('aria-selected', 'true');

    const uncategorizedOption = screen.getByRole('option', { name: /uncategorized|未分类/i });
    expect(uncategorizedOption).toHaveAttribute('aria-selected', 'false');
  });
});
