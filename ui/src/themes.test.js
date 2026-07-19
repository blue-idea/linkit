// @vitest-environment node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const themeCss = readFileSync(fileURLToPath(new URL('./index.css', import.meta.url)), 'utf8');
const tailwindConfigSource = readFileSync(
  fileURLToPath(new URL('../tailwind.config.js', import.meta.url)),
  'utf8'
);

describe('主题皮肤样式契约', () => {
  // REQ-023-AC-007：六套主题必须通过统一 CSS 令牌驱动组件颜色。
  test('Tailwind 色板使用支持透明度修饰符的 CSS 变量', () => {
    expect(tailwindConfigSource).toContain("rgb(var(--ink-950) / <alpha-value>)");
    expect(tailwindConfigSource).toContain("rgb(var(--accent-500) / <alpha-value>)");
    expect(tailwindConfigSource).toContain('var(--shadow-win-rgb)');
  });

  // REQ-023-AC-007：每套主题必须声明完整的主题选择器和视觉令牌。
  test('六套主题定义背景、表面、描边和强调色令牌', () => {
    for (const theme of ['ocean', 'graphite', 'sunset', 'daylight', 'paper']) {
      expect(themeCss).toContain(`[data-theme="${theme}"]`);
    }

    for (const token of [
      '--ink-950',
      '--ink-100',
      '--accent-400',
      '--glass-bg',
      '--hairline-rgb',
      '--shadow-win-rgb',
      '--scrollbar-rgb',
    ]) {
      expect(themeCss).toContain(token);
    }
  });

  // REQ-023-AC-007：新增浅色主题必须声明 light color scheme。
  test('Daylight 与 Paper 使用浅色 color scheme', () => {
    expect(themeCss).toMatch(/\[data-theme="daylight"\]\s*\{[\s\S]*?color-scheme:\s*light/);
    expect(themeCss).toMatch(/\[data-theme="paper"\]\s*\{[\s\S]*?color-scheme:\s*light/);
  });
});
