import { expect, test } from '@playwright/test';

const localSupabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
const hasLocalSupabase =
  localSupabaseUrl.includes('127.0.0.1') || localSupabaseUrl.includes('localhost');

const USER_A = {
  email: process.env.LINKIT_TEST_USER_A_EMAIL ?? 'user-a@linkit.test',
  password: process.env.LINKIT_TEST_USER_A_PASSWORD ?? 'LinkitTestA-Passw0rd!',
};

async function fillAuthForm(
  page: import('@playwright/test').Page,
  email: string,
  password: string
) {
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
}

async function submitSignIn(page: import('@playwright/test').Page) {
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
}

test.describe.configure({ mode: 'serial' });

test.describe('云认证', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasLocalSupabase, '需要 VITE_SUPABASE_URL 指向本地 Supabase');
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible({
      timeout: 30_000,
    });
  });

  // REQ-001-AC-001
  test('登录 shall 进入主界面', async ({ page }) => {
    await fillAuthForm(page, USER_A.email, USER_A.password);
    await submitSignIn(page);
    await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(USER_A.email)).toBeVisible();
  });

  // REQ-001-AC-003
  test('登录无效凭据 shall 停留认证界面并显示英文错误', async ({ page }) => {
    await fillAuthForm(page, USER_A.email, 'wrong-password');
    await submitSignIn(page);
    await expect(page.getByText('Invalid login credentials')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
  });

  // REQ-001-AC-002：本地 confirmations=false 时注册直接返回 session。
  test('注册 shall 在返回 session 后进入主界面', async ({ page }) => {
    const email = `signup-${Date.now()}@linkit.test`;
    await page.getByRole('button', { name: 'Sign up' }).click();
    await fillAuthForm(page, email, 'LinkitSignup-Passw0rd!');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toBeVisible({
      timeout: 30_000,
    });
  });

  // REQ-001-AC-004
  test('会话恢复 shall 刷新后直接进入主界面', async ({ page }) => {
    await fillAuthForm(page, USER_A.email, USER_A.password);
    await submitSignIn(page);
    await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toBeVisible({
      timeout: 30_000,
    });
    await page.reload();
    await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toHaveCount(0);
  });

  // REQ-002-AC-003
  test('退出登录 shall 返回认证界面并保留本机数据', async ({ page }) => {
    await page.getByRole('button', { name: 'Continue in local mode' }).click();
    await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toBeVisible();

    await page.evaluate(() => {
      localStorage.setItem(
        'lattice.library',
        JSON.stringify({
          bookmarks: [
            {
              id: 'bm-auth-keep',
              title: 'Kept After Cloud Sign Out',
              url: 'https://example.test/auth-keep',
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
    });

    await page.getByRole('button', { name: /settings|Settings|设置/i }).first().click();
    await page.getByRole('button', { name: 'Back to login' }).click();
    await expect(page.getByRole('button', { name: 'Continue in local mode' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue in local mode' }).click();
    await expect(page.getByText('Kept After Cloud Sign Out').first()).toBeVisible();
  });
});

// REQ-001-AC-006：无真实“无 session 注册”环境时，由 LoginScreen + auth-flow 单元测试覆盖。
test('注册无 session 时 shall 显示 Check your email', async ({ page }) => {
  test.skip(true, '由 LoginScreen emailConfirmationRequired + auth-flow 单元测试覆盖；本地 confirmations=false');
  await page.goto('/');
});
