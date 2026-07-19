import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { enterLocalMode } from './helpers';

const evidenceDirectory = resolve('../docs/spec/evidence');

test.describe('链接健康', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?e2eHealth=1');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterLocalMode(page);
    await mkdir(evidenceDirectory, { recursive: true });
  });

  test('未主动触发时无请求，手动扫描后保存结果并支持状态入口', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/e2e-health/**', async (route) => {
      requestCount += 1;
      const changed = route.request().url().endsWith('/changed');
      await route.fulfill({ status: changed ? 200 : 404, headers: { 'access-control-allow-origin': '*' }, body: changed ? 'changed content' : 'missing' });
    });
    await page.waitForTimeout(300);
    expect(requestCount).toBe(0);

    await page.getByLabel('Detail Panel', { exact: true }).getByRole('button', { name: /链接正常|内容已更新|链接可能失效/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Health check' });
    await expect(dialog.getByText('Manual scan only')).toBeVisible();
    expect(requestCount).toBe(0);
    await dialog.getByRole('button', { name: 'Start scan' }).click();
    await expect(dialog.getByText('Scan completed')).toBeVisible();
    expect(requestCount).toBeGreaterThan(0);
    await expect(dialog.getByText('Changed', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Broken', { exact: true })).toBeVisible();
    await expect(dialog).toHaveScreenshot('TASK-039-health-scan.png', { maxDiffPixelRatio: 0.05 });
    await page.screenshot({ path: resolve(evidenceDirectory, 'TASK-039-health-scan.png'), fullPage: true });
    await dialog.getByRole('button', { name: 'Close' }).click();

    await page.getByText('Updated', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Updated' })).toBeVisible();
    await page.getByText('Broken', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Broken' })).toBeVisible();
  });
});
