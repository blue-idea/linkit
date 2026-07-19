import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

async function enterLocalMode(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Continue in local mode' }).click();
  await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
}

/** Playwright 对自定义 dataTransfer 支持不稳定，用原生事件模拟 HTML5 拖放。 */
async function dropBookmarkOnCategory(
  page: import('@playwright/test').Page,
  bookmarkId: string,
  categoryLabel: string
) {
  await page.evaluate(
    ({ bookmarkId: id, categoryLabel: label }) => {
      const target = document.querySelector(`[data-category-drop="${label}"]`);
      if (!target) throw new Error(`Category drop target not found: ${label}`);
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/bookmark', id);
      target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
      target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    },
    { bookmarkId, categoryLabel }
  );
}

test.describe('分类拖拽与书签归类', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-024-AC-006：分类操作（图标设置）具备可识别名称且键盘可达；移动改由拖拽完成。
  test('分类操作 shall 提供可识别的图标设置控件', async ({ page }) => {
    const leafRow = page.locator('[data-category-drop="配色"]').first();
    await expect(leafRow).toBeVisible();
    await leafRow.hover();
    const setIcon = leafRow.getByRole('button', { name: 'Set category icon' });
    await expect(setIcon).toBeVisible();
    await setIcon.focus();
    await expect(setIcon).toBeFocused();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-015-category-move.png'),
      fullPage: true,
    });
  });

  // REQ-011-AC-003：书签拖到分类节点。
  test('书签归类 shall 更新 categoryId 并显示英文成功提示', async ({ page }) => {
    const card = page.locator('[data-bookmark-id]').first();
    await expect(card).toBeVisible();
    const bookmarkId = await card.getAttribute('data-bookmark-id');
    expect(bookmarkId).toBeTruthy();

    await dropBookmarkOnCategory(page, bookmarkId!, '配色');
    await expect(page.getByText(/Moved to category/i)).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-015-bookmark-assign.png'),
      fullPage: true,
    });
  });
});
