import { expect, type Page } from '@playwright/test';

/** 与 ui/src/storage.ts 中 DATA_KEY 保持一致。 */
const LOCAL_LIBRARY_KEY = 'lattice.library';

/** 默认 English：进入本地模式（REQ-023-AC-004）。 */
export async function enterLocalMode(page: Page) {
  await page.getByRole('button', { name: 'Continue in local mode' }).click();
  await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
}

export async function expectLoginGate(page: Page) {
  await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
}

/**
 * 等待 debounce 自动保存把资料库写入 localStorage。
 * App 在 libraryHydrated 后约 900ms 才持久化；E2E 取样前必须避开该窗口。
 */
export async function waitForPersistedLocalLibrary(page: Page) {
  await expect
    .poll(async () => page.evaluate((key) => localStorage.getItem(key), LOCAL_LIBRARY_KEY), {
      timeout: 5_000,
    })
    .not.toBeNull();
}

/** 读取本机资料库书签数量；尚未持久化时返回 -1。 */
export async function readPersistedBookmarkCount(page: Page): Promise<number> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return -1;
    try {
      return (JSON.parse(raw) as { bookmarks?: unknown[] }).bookmarks?.length ?? -1;
    } catch {
      return -1;
    }
  }, LOCAL_LIBRARY_KEY);
}

/** 等待主内容区至少渲染一条视图项，避免 hydration 竞态导致 before=0。 */
export async function waitForViewItems(page: Page) {
  await expect(page.locator('[data-view-item]').first()).toBeVisible({ timeout: 5_000 });
}
