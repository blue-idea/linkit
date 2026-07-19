import { expect, test } from '@playwright/test';

async function enterLocalMode(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Continue in local mode' }).click();
  await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
}

test.describe('书签 CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
  });

  // REQ-006-AC-001 / REQ-006-AC-003 / REQ-006-AC-004
  test('书签新增 shall 先显示确认预览再入库且抓取失败时英文降级', async ({ page }) => {
    await page.getByRole('button', { name: 'New', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'New Bookmark' })).toBeVisible();

    await page.getByRole('textbox', { name: 'Bookmark URL' }).fill('https://example.test/new-bookmark');
    await page.getByLabel('Bookmark title hint').fill('Manual Entry Bookmark');
    await page.getByRole('button', { name: 'Analyze', exact: true }).click();

    await expect(page.getByRole('alert')).toContainText(/Could not fetch|manual|AI analysis is unavailable/i);
    await expect(page.getByRole('button', { name: 'Save bookmark' })).toBeVisible();
    await expect(page.getByText('Manual Entry Bookmark').first()).toHaveCount(0);

    await page.getByRole('button', { name: 'Save bookmark' }).click();
    await expect(page.getByText('Manual Entry Bookmark').first()).toBeVisible();
  });

  // REQ-007-AC-001 / REQ-007-AC-002
  test('书签编辑 shall 在详情与列表同步标题', async ({ page }) => {
    const firstTitle = await page.locator('[aria-label="Edit bookmark title"]').first().textContent();
    expect(firstTitle).toBeTruthy();

    await page.getByLabel('Edit bookmark title').first().click();
    const titleInput = page.getByLabel('Bookmark title');
    await titleInput.fill('Edited Bookmark Title');
    await titleInput.blur();

    await expect(page.getByText('Edited Bookmark Title').first()).toBeVisible();
    await expect(page.getByLabel('Edit bookmark title')).toHaveText('Edited Bookmark Title');
  });

  // REQ-007-AC-003 / REQ-007-AC-004
  test('书签删除 shall 先确认再从资料库移除', async ({ page }) => {
    const title = await page.getByLabel('Edit bookmark title').first().textContent();
    expect(title).toBeTruthy();

    // 详情面板删除走单条确认；列表上有多枚同名 Delete，不可全局定位。
    const detail = page.getByRole('complementary', { name: 'Detail Panel' });
    await detail.getByRole('button', { name: 'Delete bookmark' }).click();
    await expect(page.getByRole('dialog', { name: 'Delete this bookmark?' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText(title!, { exact: true }).first()).toBeVisible();

    await detail.getByRole('button', { name: 'Delete bookmark' }).click();
    await page.getByRole('dialog', { name: 'Delete this bookmark?' }).getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(title!, { exact: true })).toHaveCount(0);
  });
});
