import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const visualEvidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

// REQ-028-AC-004：视觉回归框架须生成 Baseline、Actual 与 Diff 证据目录。
test.describe('主窗口视觉回归', () => {
  test('[Visual] 本地模式主窗口 shall 匹配已批准 Baseline', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.getByRole('button', { name: 'Continue in local mode' }).click();
    await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toBeVisible();

    await expect(page).toHaveScreenshot('main-window-baseline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.08,
    });

    await mkdir(visualEvidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(visualEvidenceDirectory, 'TASK-002-main-window-actual.png'),
      fullPage: true,
    });
  });
});
