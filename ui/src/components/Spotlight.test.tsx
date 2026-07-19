import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Spotlight } from './Spotlight';
import { bookmarks, categories, collections, tags } from '../data';

const TestSpotlight = Spotlight as React.ComponentType<
  React.ComponentProps<typeof Spotlight> & { onOpenDirectly: (id: string) => void }
>;

function renderSpotlight() {
  const props = {
    open: true,
    bookmarks,
    tags,
    categories,
    collections,
    aiContext: null,
    onSelect: vi.fn(),
    onOpenDirectly: vi.fn(),
    onClose: vi.fn(),
    onNewFromUrl: vi.fn(),
  };

  render(<TestSpotlight {...props} />);

  return props;
}

describe('Spotlight', () => {
  afterEach(() => cleanup());

  // REQ-017-AC-005：搜索结果回车确认应直接访问网站，不走详情定位。
  test('[组件] 搜索结果 Enter 确认 shall 直接打开高亮书签并关闭 Spotlight', async () => {
    const user = userEvent.setup();
    const props = renderSpotlight();

    await user.type(screen.getByLabelText('Spotlight search'), 'React');
    await screen.findByRole('option', { name: /React 官方文档/i });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(props.onOpenDirectly).toHaveBeenCalledWith('b-react');
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  // REQ-017-AC-003：鼠标选择搜索结果仍保留详情定位行为。
  test('[组件] 点击搜索结果 shall 选择书签并关闭 Spotlight', async () => {
    const user = userEvent.setup();
    const props = renderSpotlight();

    await user.type(screen.getByLabelText('Spotlight search'), 'React');
    await user.click(await screen.findByRole('option', { name: /React 官方文档/i }));

    expect(props.onSelect).toHaveBeenCalledWith('b-react');
    expect(props.onOpenDirectly).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
