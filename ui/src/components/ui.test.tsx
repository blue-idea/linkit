import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Kbd } from './ui';

// REQ-024-AC-006：组件测试框架须能验证可访问控件名称与语义结构。
describe('Kbd', () => {
  it('[组件] 渲染快捷键标签 shall 暴露可识别的控件文本', () => {
    render(<Kbd>⌘K</Kbd>);

    const shortcut = screen.getByText('⌘K');
    expect(shortcut.tagName).toBe('KBD');
    expect(shortcut.textContent).toBe('⌘K');
  });
});
