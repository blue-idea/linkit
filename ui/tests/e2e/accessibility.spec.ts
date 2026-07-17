import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// REQ-024-AC-006：TASK-002 验证 axe-core 已接入，并对主窗顶栏核心控件做可访问名称冒烟。
// 全页 WCAG 严重级清零由 TASK-022 负责。
test.describe('主窗口无障碍基线', () => {
  test('[E2E] 本地模式主界面 shall 暴露顶栏核心控件名称且 axe 可分析', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '使用本地模式（无需登录）' }).click();

    await expect(page.getByRole('button', { name: '切换侧边栏' })).toBeVisible();
    await expect(page.getByRole('button', { name: '搜索' })).toBeVisible();
    await expect(page.getByRole('button', { name: '设置' })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(Array.isArray(results.violations)).toBe(true);
    expect(results.url).toContain('127.0.0.1');
  });
});
