import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterLocalMode, resetApp } from '../e2e/local-mvp/helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

test.describe('主窗口响应式扩展', () => {
  // REQ-024-AC-001 / REQ-028-AC-004
  test('窗口从 1280×800 放大到 1920×1080 时应用壳体同步扩展', async ({ page }) => {
    await resetApp(page);
    await enterLocalMode(page);

    const shell = page.getByRole('banner', { name: 'Top bar' }).locator('..');
    const compactBox = await shell.boundingBox();
    expect(compactBox).not.toBeNull();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.getByRole('main', { name: 'Content Area' })).toBeVisible();
    const expandedBox = await shell.boundingBox();
    expect(expandedBox).not.toBeNull();

    expect(expandedBox!.width).toBeGreaterThan(compactBox!.width + 500);
    expect(expandedBox!.height).toBeGreaterThan(compactBox!.height + 200);
    expect(expandedBox!.width).toBeCloseTo(1872, 0);
    expect(expandedBox!.height).toBeCloseTo(1032, 0);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'responsive-window-1920x1080-actual.png'),
      fullPage: true,
    });
    await expect(page).toHaveScreenshot('responsive-window-1920x1080-baseline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.08,
    });
  });
});
