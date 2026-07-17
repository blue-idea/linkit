import { expect, test } from '@playwright/test';

// REQ-028-AC-004：E2E 框架须能启动开发服务器并验证主窗口关键区域可见。
test.describe('开发服务器冒烟', () => {
  test('[E2E] 本地模式启动后 shall 显示 Sidebar 与 Content Area', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '使用本地模式（无需登录）' }).click();

    await expect(page.getByRole('button', { name: '切换侧边栏' })).toBeVisible();
    await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '搜索' })).toBeVisible();
    await expect(page.getByRole('button', { name: '新增', exact: true })).toBeVisible();
  });
});
