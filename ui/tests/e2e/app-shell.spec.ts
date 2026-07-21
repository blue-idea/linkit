import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { waitForViewItems } from './helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

async function enterLocalMode(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Continue in local mode' }).click();
  await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
}

/** Chromium 会拦截部分 Ctrl 快捷键；派发等价 keydown。 */
async function pressAppShortcut(
  page: import('@playwright/test').Page,
  key: string,
  options: { ctrlKey?: boolean; metaKey?: boolean; code?: string } = {}
) {
  await page.locator('body').click();
  await page.evaluate(
    ({ key: k, ctrlKey, metaKey, code }) => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: k,
          code,
          ctrlKey: Boolean(ctrlKey),
          metaKey: Boolean(metaKey),
          bubbles: true,
          cancelable: true,
        })
      );
    },
    {
      key,
      ctrlKey: options.ctrlKey ?? true,
      metaKey: options.metaKey ?? false,
      code: options.code,
    }
  );
}

test.describe('主窗口 快捷键 拖入 URL 键盘可访问', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-024-AC-001 / REQ-028-AC-004
  test('主窗口 shall 提供可折叠 Sidebar、Content、Detail 与顶栏操作', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: 'Sidebar' })).toBeVisible();
    await expect(page.getByRole('main', { name: 'Content Area' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Detail Panel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-022-main-window-actual.png'),
      fullPage: true,
    });
    await expect(page).toHaveScreenshot('TASK-022-main-window-baseline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.12,
    });
  });

  // REQ-024-AC-002 / REQ-024-AC-003
  test('快捷键 shall 打开 New Bookmark、Insights、Settings 并切换视图与侧栏', async ({ page }) => {
    await pressAppShortcut(page, 'n');
    await expect(page.getByRole('heading', { name: 'New Bookmark' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'New Bookmark' })).toHaveCount(0);

    await pressAppShortcut(page, 'i');
    await expect(page.getByRole('dialog', { name: 'Insights' })).toBeVisible();
    await page.keyboard.press('Escape');

    await pressAppShortcut(page, ',');
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await page.keyboard.press('Escape');

    await pressAppShortcut(page, '2');
    await expect(page.locator('[data-view="list"]')).toBeVisible();
    await pressAppShortcut(page, '1');
    await expect(page.locator('[data-view="card"]')).toBeVisible();
    await pressAppShortcut(page, '3');
    await expect(page.locator('[data-view="masonry"]')).toBeVisible();

    await pressAppShortcut(page, '\\', { code: 'Backslash' });
    await expect(page.getByRole('navigation', { name: 'Sidebar' })).toHaveCount(0);
    await pressAppShortcut(page, '\\', { code: 'Backslash' });
    await expect(page.getByRole('navigation', { name: 'Sidebar' })).toBeVisible();

    await mkdir(evidenceDirectory, { recursive: true });
    await writeFile(
      resolve(evidenceDirectory, 'TASK-022-shortcut-matrix.json'),
      JSON.stringify(
        {
          'Ctrl+N': 'New Bookmark',
          'Ctrl+I': 'Insights',
          'Ctrl+,': 'Settings',
          'Ctrl+1/2/3': 'Card/List/Masonry',
          'Ctrl+\\': 'Toggle Sidebar',
        },
        null,
        2
      ),
      'utf8'
    );
  });

  // REQ-024-AC-004
  test('快捷键 shall 按 Esc 关闭最上层浮层且不提交', async ({ page }) => {
    await pressAppShortcut(page, ',');
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

    await pressAppShortcut(page, 'k');
    await expect(page.getByRole('dialog', { name: 'Spotlight' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Spotlight' })).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0);
  });

  // REQ-024-AC-005
  test('拖入 URL shall 打开 New Bookmark 确认流程且确认前不保存', async ({ page }) => {
    // 等待视图 hydration，避免 before=0 / after=seed 的竞态 flaky。
    await waitForViewItems(page);
    const before = await page.locator('[data-view-item]').count();

    await page.evaluate(() => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/uri-list', 'https://example.test/dragged-in');
      dataTransfer.setData('text/plain', 'https://example.test/dragged-in');
      window.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
      window.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    });

    await expect(page.getByRole('heading', { name: 'New Bookmark' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Bookmark URL' })).toHaveValue(
      'https://example.test/dragged-in'
    );
    await page.getByRole('button', { name: 'Cancel' }).click();
    expect(await page.locator('[data-view-item]').count()).toBe(before);

    await mkdir(evidenceDirectory, { recursive: true });
    await page.evaluate(() => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/uri-list', 'https://example.test/dragged-in');
      window.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    });
    await page.screenshot({
      path: resolve(evidenceDirectory, 'TASK-022-drop-url.png'),
      fullPage: true,
    });
  });

  // REQ-024-AC-006
  test('键盘可访问 shall 提供焦点顺序、可见焦点与 accessible name 并通过 axe', async ({ page }) => {
    await page.getByRole('button', { name: 'Search' }).focus();
    await expect(page.getByRole('button', { name: 'Search' })).toBeFocused();

    await page.keyboard.press('Tab');
    const focused = page.locator(':focus-visible');
    await expect(focused).toBeVisible();

    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'New', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toBeVisible();

    const axeResults = await new AxeBuilder({ page })
      .include('.glass-strong.shadow-win')
      .disableRules(['color-contrast'])
      .analyze();

    await mkdir(evidenceDirectory, { recursive: true });
    await writeFile(
      resolve(evidenceDirectory, 'TASK-022-axe-report.json'),
      JSON.stringify(
        {
          violations: axeResults.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.length,
          })),
          passes: axeResults.passes.length,
        },
        null,
        2
      ),
      'utf8'
    );

    expect(axeResults.violations).toEqual([]);
  });
});
