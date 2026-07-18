import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

async function enterLocalMode(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '使用本地模式（无需登录）' }).click();
  await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
}

test.describe('Timeline Tag Aggregation Theme Space', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole('button', { name: '使用本地模式（无需登录）' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-016-AC-001 / REQ-028-AC-004
  test('Timeline shall 默认按 createdAt 分组并提供时间源切换', async ({ page }) => {
    await page.getByRole('button', { name: 'Timeline view' }).click();
    await expect(page.locator('[data-view="timeline"]')).toBeVisible();
    await expect(page.getByLabel('Timeline time source')).toBeVisible();
    const groupCount = await page.locator('[data-timeline-group]').count();
    expect(groupCount).toBeGreaterThan(0);

    await page.getByLabel('Timeline time source').selectOption('lastVisitedAt');
    await expect(page.locator('[data-view="timeline"]')).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-020-timeline-actual.png'),
      fullPage: true,
    });
    await expect(page).toHaveScreenshot('TASK-020-timeline-baseline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
    });
  });

  // REQ-016-AC-003 / REQ-028-AC-004（E2E 视觉补充 Unit）
  test('Tag Aggregation shall 按标签分组并显示成员计数', async ({ page }) => {
    await page.getByRole('button', { name: 'Tag Aggregation view' }).click();
    await expect(page.locator('[data-view="tag-aggregation"]')).toBeVisible();
    const firstGroup = page.locator('[data-tag-group]').first();
    await expect(firstGroup).toBeVisible();
    await expect(firstGroup).toContainText(/\d+/);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-020-tag-aggregation-actual.png'),
      fullPage: true,
    });
    await expect(page).toHaveScreenshot('TASK-020-tag-aggregation-baseline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
    });
  });

  // REQ-016-AC-004 / REQ-028-AC-004
  test('Theme Space shall 以主题容器展示元数据与成员', async ({ page }) => {
    await page.getByRole('button', { name: 'Theme Space view' }).click();
    await expect(page.locator('[data-view="theme-space"]')).toBeVisible();
    const container = page.locator('[data-theme-container]').first();
    await expect(container).toBeVisible();
    await expect(container.locator('[data-view-item="theme-space"]').first()).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-020-theme-space-actual.png'),
      fullPage: true,
    });
    await expect(page).toHaveScreenshot('TASK-020-theme-space-baseline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
    });
  });
});
