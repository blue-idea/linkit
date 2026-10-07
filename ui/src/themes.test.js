// @vitest-environment node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const themeCss = readFileSync(fileURLToPath(new URL('./index.css', import.meta.url)), 'utf8');
const tailwindConfigSource = readFileSync(
  fileURLToPath(new URL('../tailwind.config.js', import.meta.url)),
  'utf8'
);

import { themes } from './themes';

describe('主题皮肤样式契约', () => {
  // REQ-023-AC-007：六套主题必须通过统一 CSS 令牌驱动组件颜色。
  test('Tailwind 色板使用支持透明度修饰符的 CSS 变量', () => {
    expect(tailwindConfigSource).toContain("rgb(var(--ink-950) / <alpha-value>)");
    expect(tailwindConfigSource).toContain("rgb(var(--accent-500) / <alpha-value>)");
    expect(tailwindConfigSource).toContain('var(--shadow-win-rgb)');
  });

  // REQ-023-AC-007：十二套主题必须声明完整的主题选择器和视觉令牌。
  test('十二套主题定义背景、表面、描边和强调色令牌', () => {
    for (const theme of ['ocean', 'graphite', 'sunset', 'daylight', 'paper', 'cupertino', 'sequoia', 'obsidian', 'aurora', 'provence', 'monet']) {
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

  // REQ-023-AC-007：六套浅色主题声明 light color scheme，其余主题声明 dark color scheme。
  test('浅色主题使用 light color scheme，Obsidian 与 Aurora 使用 dark color scheme', () => {
    expect(themeCss).toMatch(/\[data-theme="daylight"\]\s*\{[\s\S]*?color-scheme:\s*light/);
    expect(themeCss).toMatch(/\[data-theme="paper"\]\s*\{[\s\S]*?color-scheme:\s*light/);
    expect(themeCss).toMatch(/\[data-theme="cupertino"\]\s*\{[\s\S]*?color-scheme:\s*light/);
    expect(themeCss).toMatch(/\[data-theme="sequoia"\]\s*\{[\s\S]*?color-scheme:\s*light/);
    expect(themeCss).toMatch(/\[data-theme="provence"\]\s*\{[\s\S]*?color-scheme:\s*light/);
    expect(themeCss).toMatch(/\[data-theme="monet"\]\s*\{[\s\S]*?color-scheme:\s*light/);
    expect(themeCss).toMatch(/\[data-theme="obsidian"\]\s*\{[\s\S]*?color-scheme:\s*dark/);
    expect(themeCss).toMatch(/\[data-theme="aurora"\]\s*\{[\s\S]*?color-scheme:\s*dark/);
  });

  // REQ-023-AC-007：采用 macOS 3-Pane 设计模式的主题定义左中右三栏分层样式规则。
  test('Cupertino、Sequoia、Obsidian、Aurora、Provence 与 Monet 定义 macOS 3-Pane 差异化分栏样式', () => {
    expect(themeCss).toMatch(/\[data-theme="cupertino"\]\s+nav/);
    expect(themeCss).toMatch(/\[data-theme="cupertino"\]\s+main/);
    expect(themeCss).toMatch(/\[data-theme="cupertino"\]\s+aside/);
    expect(themeCss).toMatch(/\[data-theme="sequoia"\]\s+nav/);
    expect(themeCss).toMatch(/\[data-theme="sequoia"\]\s+main/);
    expect(themeCss).toMatch(/\[data-theme="sequoia"\]\s+aside/);
    expect(themeCss).toMatch(/\[data-theme="provence"\]\s+nav/);
    expect(themeCss).toMatch(/\[data-theme="provence"\]\s+main/);
    expect(themeCss).toMatch(/\[data-theme="provence"\]\s+aside/);
    expect(themeCss).toMatch(/\[data-theme="monet"\]\s+nav/);
    expect(themeCss).toMatch(/\[data-theme="monet"\]\s+main/);
    expect(themeCss).toMatch(/\[data-theme="monet"\]\s+aside/);
    expect(themeCss).toMatch(/\[data-theme="obsidian"\]\s+nav/);
    expect(themeCss).toMatch(/\[data-theme="obsidian"\]\s+main/);
    expect(themeCss).toMatch(/\[data-theme="obsidian"\]\s+aside/);
    expect(themeCss).toMatch(/\[data-theme="aurora"\]\s+nav/);
    expect(themeCss).toMatch(/\[data-theme="aurora"\]\s+main/);
    expect(themeCss).toMatch(/\[data-theme="aurora"\]\s+aside/);
  });

  // REQ-023-AC-007：浅色异色主题采用非白色浅色调，卡片、表面与分栏均不得使用纯白色。
  test('Cupertino、Sequoia、Provence 与 Monet 主题不使用纯白色或灰白色作为卡片与分栏底色', () => {
    const cupertinoBlock = themeCss.match(/\[data-theme="cupertino"\]\s*\{([\s\S]*?)\}/)?.[1] || '';
    const sequoiaBlock = themeCss.match(/\[data-theme="sequoia"\]\s*\{([\s\S]*?)\}/)?.[1] || '';
    const provenceBlock = themeCss.match(/\[data-theme="provence"\]\s*\{([\s\S]*?)\}/)?.[1] || '';
    const monetBlock = themeCss.match(/\[data-theme="monet"\]\s*\{([\s\S]*?)\}/)?.[1] || '';

    // 卡片背景与玻璃层不得为纯白色 255 255 255
    expect(cupertinoBlock).not.toMatch(/--ink-800:\s*255\s+255\s+255/);
    expect(cupertinoBlock).not.toMatch(/--glass-bg:\s*255\s+255\s+255/);
    expect(sequoiaBlock).not.toMatch(/--ink-800:\s*255\s+255\s+255/);
    expect(sequoiaBlock).not.toMatch(/--glass-bg:\s*255\s+255\s+255/);
    expect(provenceBlock).not.toMatch(/--ink-800:\s*255\s+255\s+255/);
    expect(provenceBlock).not.toMatch(/--glass-bg:\s*255\s+255\s+255/);
    expect(monetBlock).not.toMatch(/--ink-800:\s*255\s+255\s+255/);
    expect(monetBlock).not.toMatch(/--glass-bg:\s*255\s+255\s+255/);

    // main 栏不得使用纯白
    const cupertinoMain = themeCss.match(/\[data-theme="cupertino"\]\s+main\s+\.glass\s*\{([\s\S]*?)\}/)?.[1] || '';
    const sequoiaMain = themeCss.match(/\[data-theme="sequoia"\]\s+main\s+\.glass\s*\{([\s\S]*?)\}/)?.[1] || '';
    const provenceMain = themeCss.match(/\[data-theme="provence"\]\s+main\s+\.glass\s*\{([\s\S]*?)\}/)?.[1] || '';
    const monetMain = themeCss.match(/\[data-theme="monet"\]\s+main\s+\.glass\s*\{([\s\S]*?)\}/)?.[1] || '';
    expect(cupertinoMain).not.toMatch(/rgba?\(\s*255\s*,\s*255\s*,\s*255/);
    expect(sequoiaMain).not.toMatch(/rgba?\(\s*253\s*,\s*254\s*,\s*253/);
    expect(sequoiaMain).not.toMatch(/rgba?\(\s*255\s*,\s*255\s*,\s*255/);
    expect(provenceMain).not.toMatch(/rgba?\(\s*255\s*,\s*255\s*,\s*255/);
    expect(monetMain).not.toMatch(/rgba?\(\s*255\s*,\s*255\s*,\s*255/);

    // 预览色板不包含纯白底色
    for (const themeId of ['cupertino', 'sequoia', 'provence', 'monet']) {
      const def = themes.find((t) => t.id === themeId);
      expect(def?.swatches).not.toContain('#ffffff');
    }
  });

  // REQ-023-AC-007：Cupertino、Sequoia、Provence 与 Monet 声明专属的三栏异色与预览色板契约。
  test('Cupertino、Sequoia、Provence 与 Monet 声明专属的三栏异色与预览色板契约', () => {
    // Cupertino 三栏异色：浅天蓝、浅鹅黄、浅丁香紫
    expect(themeCss).toMatch(/\[data-theme="cupertino"\]\s+nav\s+\.glass\s*\{[\s\S]*?rgba\(\s*218\s*,\s*232\s*,\s*252/);
    expect(themeCss).toMatch(/\[data-theme="cupertino"\]\s+main\s+\.glass\s*\{[\s\S]*?rgba\(\s*254\s*,\s*250\s*,\s*235/);
    expect(themeCss).toMatch(/\[data-theme="cupertino"\]\s+aside\s+\.glass\s*\{[\s\S]*?rgba\(\s*240\s*,\s*233\s*,\s*252/);
    expect(themeCss).toMatch(/\[data-theme="cupertino"\]\s*\{[\s\S]*?--ink-800:\s*252\s+247\s+230/);

    // Sequoia（卡布奇诺）三栏异色：明晰暖焙奶咖左栏、香草炼乳浅米中栏、清爽开心果浅草绿右栏
    expect(themeCss).toMatch(/\[data-theme="sequoia"\]\s+nav\s+\.glass\s*\{[\s\S]*?rgba\(\s*232\s*,\s*208\s*,\s*182/);
    expect(themeCss).toMatch(/\[data-theme="sequoia"\]\s+main\s+\.glass\s*\{[\s\S]*?rgba\(\s*254\s*,\s*248\s*,\s*230/);
    expect(themeCss).toMatch(/\[data-theme="sequoia"\]\s+aside\s+\.glass\s*\{[\s\S]*?rgba\(\s*224\s*,\s*242\s*,\s*224/);
    expect(themeCss).toMatch(/\[data-theme="sequoia"\]\s*\{[\s\S]*?--ink-800:\s*248\s+238\s+214/);

    // Provence（普罗旺斯）三栏异色：烟粉玫瑰左栏、雪燕柔粉白中栏、霜蓝霁青右栏
    expect(themeCss).toMatch(/\[data-theme="provence"\]\s+nav\s+\.glass\s*\{[\s\S]*?rgba\(\s*238\s*,\s*212\s*,\s*224/);
    expect(themeCss).toMatch(/\[data-theme="provence"\]\s+main\s+\.glass\s*\{[\s\S]*?rgba\(\s*253\s*,\s*247\s*,\s*250/);
    expect(themeCss).toMatch(/\[data-theme="provence"\]\s+aside\s+\.glass\s*\{[\s\S]*?rgba\(\s*222\s*,\s*232\s*,\s*250/);
    expect(themeCss).toMatch(/\[data-theme="provence"\]\s*\{[\s\S]*?--ink-800:\s*247\s+236\s+242/);

    // Monet（莫奈花园）三栏异色：鼠尾草水青左栏、月光白桃中栏、晚霞杏金右栏
    expect(themeCss).toMatch(/\[data-theme="monet"\]\s+nav\s+\.glass\s*\{[\s\S]*?rgba\(\s*214\s*,\s*236\s*,\s*226/);
    expect(themeCss).toMatch(/\[data-theme="monet"\]\s+main\s+\.glass\s*\{[\s\S]*?rgba\(\s*254\s*,\s*250\s*,\s*244/);
    expect(themeCss).toMatch(/\[data-theme="monet"\]\s+aside\s+\.glass\s*\{[\s\S]*?rgba\(\s*253\s*,\s*242\s*,\s*218/);
    expect(themeCss).toMatch(/\[data-theme="monet"\]\s*\{[\s\S]*?--ink-800:\s*248\s+240\s+230/);

    // 左侧栏专属文字对比度与清晰度增强规则
    expect(themeCss).toMatch(/\[data-theme="sequoia"\]\s+nav\s+\[class\*="text-ink-400"\]/);
    expect(themeCss).toMatch(/\[data-theme="sequoia"\]\s+nav\s+\[class\*="text-ink-200"\]/);
    expect(themeCss).toMatch(/\[data-theme="provence"\]\s+nav\s+\[class\*="text-ink-400"\]/);
    expect(themeCss).toMatch(/\[data-theme="provence"\]\s+nav\s+\[class\*="text-ink-200"\]/);
    expect(themeCss).toMatch(/\[data-theme="monet"\]\s+nav\s+\[class\*="text-ink-400"\]/);
    expect(themeCss).toMatch(/\[data-theme="monet"\]\s+nav\s+\[class\*="text-ink-200"\]/);

    // 色板与名称契约精确匹配
    const cupertinoDef = themes.find((t) => t.id === 'cupertino');
    const sequoiaDef = themes.find((t) => t.id === 'sequoia');
    const provenceDef = themes.find((t) => t.id === 'provence');
    const monetDef = themes.find((t) => t.id === 'monet');
    expect(cupertinoDef?.swatches).toEqual(['#dae8fc', '#fef4c0', '#f0e9fc', '#007aff']);
    expect(sequoiaDef?.swatches).toEqual(['#e8d0b6', '#fef8e6', '#e0f2e0', '#059669']);
    expect(sequoiaDef?.name).toBe('Cappuccino');
    expect(provenceDef?.swatches).toEqual(['#eed4e0', '#fdf7fa', '#dee8fa', '#7c3aed']);
    expect(provenceDef?.name).toBe('Provence');
    expect(monetDef?.swatches).toEqual(['#d6ece2', '#fefaf4', '#fdf2da', '#0891b2']);
    expect(monetDef?.name).toBe('Monet');
  });
});
