import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { BookmarkItemActions } from './BookmarkItemActions';

function renderActions(overrides: Partial<Parameters<typeof BookmarkItemActions>[0]> = {}) {
  const props = {
    title: 'React 官方文档',
    selected: false,
    selectionMode: false,
    onToggleSelect: vi.fn(),
    onVisit: vi.fn(),
    onEdit: vi.fn(),
    onMove: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };

  render(
    <div onClick={props.onEdit}>
      <BookmarkItemActions {...props} />
    </div>
  );

  return props;
}

describe('BookmarkItemActions', () => {
  afterEach(() => cleanup());

  // REQ-008-AC-005：书签项操作区必须提供区别于详情 Visit 的直接访问入口。
  test('[组件] 普通模式 shall 渲染独立直接访问按钮并只触发访问回调', async () => {
    const user = userEvent.setup();
    const props = renderActions();

    await user.click(screen.getByRole('button', { name: 'Open bookmark directly' }));

    expect(props.onVisit).toHaveBeenCalledTimes(1);
    expect(props.onEdit).not.toHaveBeenCalled();
    expect(props.onMove).not.toHaveBeenCalled();
    expect(props.onDelete).not.toHaveBeenCalled();
  });

  // REQ-008-AC-005：选择模式保留复选框，同时仍允许直接访问单个书签。
  test('[组件] 选择模式 shall 同时保留选择框和直接访问按钮', async () => {
    const user = userEvent.setup();
    const props = renderActions({ selectionMode: true });

    await user.click(screen.getByRole('checkbox', { name: 'Select bookmark React 官方文档' }));
    await user.click(screen.getByRole('button', { name: 'Open bookmark directly' }));

    expect(props.onToggleSelect).toHaveBeenCalledWith(true);
    expect(props.onVisit).toHaveBeenCalledTimes(1);
  });

  // REQ-012-AC-011：主题视图显示移出入口，点击立即回调。
  test('[组件] 提供 onRemoveFromCollection 时 shall 渲染移出按钮并触发回调', async () => {
    const user = userEvent.setup();
    const onRemoveFromCollection = vi.fn();
    renderActions({ onRemoveFromCollection });

    await user.click(screen.getByRole('button', { name: 'Remove from collection' }));
    expect(onRemoveFromCollection).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Remove from collection' })).toBeTruthy();
  });

  // REQ-012-AC-011：非主题视图不显示移出入口。
  test('[组件] 未提供 onRemoveFromCollection 时 shall 不渲染移出按钮', () => {
    renderActions();
    expect(screen.queryByRole('button', { name: 'Remove from collection' })).toBeNull();
  });
});
