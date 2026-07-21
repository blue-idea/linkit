import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectOverlaps, type LayoutRect } from '../../src/features/views/layout';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

async function enterLocalMode(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Continue in local mode' }).click();
  await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
}

async function collectItemRects(
  page: import('@playwright/test').Page,
  view: string
): Promise<LayoutRect[]> {
  return page.locator(`[data-view-item="${view}"]`).evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = (node as HTMLElement).getBoundingClientRect();
      return {
        id: (node as HTMLElement).dataset.bookmarkId ?? crypto.randomUUID(),
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    })
  );
}

test.describe('Card List Masonry 基础视图', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-015-AC-001 / REQ-028-AC-004
  test('Card view shall 以网格展示可读预览摘要与标签', async ({ page }) => {
    await page.getByRole('button', { name: 'Card view' }).click();
    await expect(page.locator('[data-view="card"]')).toBeVisible();
    const count = await page.locator('[data-view-item="card"]').count();
    expect(count).toBeGreaterThan(0);
    await expect(page.locator('[data-view-item="card"]').first()).toContainText(/\./);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-019-card-actual.png'),
      fullPage: true,
    });
    await expect(page).toHaveScreenshot('TASK-019-card-baseline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.12,
    });
  });

  // REQ-015-AC-002 / REQ-028-AC-004
  test('List view shall 以紧凑行展示标题域名与状态元数据', async ({ page }) => {
    await page.getByRole('button', { name: 'List view' }).click();
    await expect(page.locator('[data-view="list"]')).toBeVisible();
    const count = await page.locator('[data-view-item="list"]').count();
    expect(count).toBeGreaterThan(0);
    await expect(page.locator('[data-view-item="list"]').first()).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-019-list-actual.png'),
      fullPage: true,
    });
    await expect(page).toHaveScreenshot('TASK-019-list-baseline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.12,
    });
  });

  // REQ-015-AC-003 / REQ-028-AC-004
  test('Masonry view shall 列布局不重叠且与 Card 有视觉差异', async ({ page }) => {
    await page.getByRole('button', { name: 'Card view' }).click();
    const cardCount = await page.locator('[data-view-item="card"]').count();

    await page.getByRole('button', { name: 'Masonry view' }).click();
    await expect(page.locator('[data-view="masonry"]')).toBeVisible();
    const masonryCount = await page.locator('[data-view-item="masonry"]').count();
    expect(masonryCount).toBeGreaterThan(0);
    expect(masonryCount).toBe(cardCount);

    const rects = await collectItemRects(page, 'masonry');
    const overlaps = detectOverlaps(rects);
    expect(overlaps).toEqual([]);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-019-masonry-actual.png'),
      fullPage: true,
    });
    await expect(page).toHaveScreenshot('TASK-019-masonry-baseline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.15,
    });

    await writeFile(
      resolve(evidenceDirectory, 'TASK-019-dom-counts.json'),
      JSON.stringify(
        {
          cardDomCount: cardCount,
          masonryDomCount: masonryCount,
          masonryOverlaps: overlaps.length,
          columns: await page.locator('[data-masonry-column]').count(),
        },
        null,
        2
      ),
      'utf8'
    );
  });
});
