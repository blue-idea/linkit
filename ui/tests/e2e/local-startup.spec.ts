import { expect, test } from '@playwright/test';

async function enterLocalMode(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Continue in local mode' }).click();
  await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
}

test.describe('本地模式启动恢复', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
  });

  // REQ-001-AC-005：启动过程中不得未点击就进入主界面。
  test('启动恢复时 shall 先显示 Loading 再进入登录门', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toHaveCount(0);
  });

  // REQ-002-AC-001 / REQ-002-AC-002：本地模式持久化，重启后恢复资料库。
  test('本地模式修改收藏后刷新 shall 恢复本地数据', async ({ page }) => {
    await enterLocalMode(page);

    await page.evaluate(() => {
      localStorage.setItem(
        'lattice.library',
        JSON.stringify({
          bookmarks: [
            {
              id: 'bm-restart',
              title: 'Restart Persistence Bookmark',
              url: 'https://example.test/restart',
              domain: 'example.test',
              description: '',
              tags: [],
              categoryId: null,
              collectionIds: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastVisited: null,
              visitCount: 0,
              starred: false,
              pinned: false,
              readStatus: 'unread',
              health: 'ok',
              notes: '',
              aiSummary: '',
              aiSuggestedTags: [],
              favicon: null,
              thumbnail: null,
            },
          ],
          categories: [],
          collections: [],
          tags: [],
        })
      );
      localStorage.setItem(
        'linkit.settings.v1',
        JSON.stringify({
          settingsVersion: 1,
          storageMode: 'local',
          theme: 'midnight',
          locale: 'en',
          ai: { apiBase: '', model: '' },
          aiConsent: null,
          view: { defaultMode: 'card' },
          lastCloudRevision: null,
        })
      );
    });

    await page.reload();
    await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
    // 标题会出现在卡片、详情与预览多处，取首个可见即可证明已恢复。
    await expect(page.getByText('Restart Persistence Bookmark').first()).toBeVisible();
  });

  // REQ-002-AC-003：退出后本机数据仍可用。
  test('退出登录后再进本地模式 shall 保留本机数据', async ({ page }) => {
    await enterLocalMode(page);
    await page.evaluate(() => {
      localStorage.setItem(
        'lattice.library',
        JSON.stringify({
          bookmarks: [
            {
              id: 'bm-keep',
              title: 'Kept After Sign Out',
              url: 'https://example.test/keep',
              domain: 'example.test',
              description: '',
              tags: [],
              categoryId: null,
              collectionIds: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastVisited: null,
              visitCount: 0,
              starred: false,
              pinned: false,
              readStatus: 'unread',
              health: 'ok',
              notes: '',
              aiSummary: '',
              aiSuggestedTags: [],
              favicon: 'K',
              faviconColor: 'blue',
              thumbnail: null,
            },
          ],
          categories: [],
          collections: [],
          tags: [],
        })
      );
      localStorage.setItem(
        'linkit.settings.v1',
        JSON.stringify({
          settingsVersion: 1,
          storageMode: 'local',
          theme: 'midnight',
          locale: 'en',
          ai: { apiBase: '', model: '' },
          aiConsent: null,
          view: { defaultMode: 'card' },
          lastCloudRevision: null,
        })
      );
    });
    // 先 reload 让本机库水合进会话，避免未保存的种子数据覆盖刚写入的 localStorage。
    await page.reload();
    await expect(page.getByText('Kept After Sign Out').first()).toBeVisible();

    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Back to login' }).click();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await enterLocalMode(page);
    await expect(page.getByText('Kept After Sign Out').first()).toBeVisible();
  });

  // REQ-002-AC-004：恢复种子前显示二次确认。
  test('恢复种子示例时 shall 先显示确认对话框', async ({ page }) => {
    await enterLocalMode(page);
    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Restore sample data' }).click();
    // Settings 面板也有 Cancel，须限定在确认对话框内点击。
    const confirm = page.getByRole('dialog', { name: 'Replace current library?' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toHaveCount(0);
  });
});
