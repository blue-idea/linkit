import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Favicon, Kbd } from './ui';

// REQ-024-AC-006：组件测试框架须能验证可访问控件名称与语义结构。
describe('Kbd', () => {
  it('[组件] 渲染快捷键标签 shall 暴露可识别的控件文本', () => {
    render(<Kbd>⌘K</Kbd>);

    const shortcut = screen.getByText('⌘K');
    expect(shortcut.tagName).toBe('KBD');
    expect(shortcut.textContent).toBe('⌘K');
  });
});

describe('Favicon', () => {
  // REQ-002-AC-002：缺失颜色时不得抛错导致主界面崩溃。
  it('[组件] 缺少 color/glyph 时 shall 安全回退渲染', () => {
    render(<Favicon glyph={null} color={null} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('[组件] 传入 http 图片地址时 shall 渲染图片图标', () => {
    const { container } = render(<Favicon glyph="https://example.test/favicon.png" color="blue" />);
    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    expect(image).toHaveAttribute('src', 'https://example.test/favicon.png');
  });
});
