import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PrimaryActionCounter,
  enterLocalMode,
  openNewBookmark,
  resetApp,
} from './helpers';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../docs/spec/evidence'
);

async function mergeActionCount(entry: Record<string, unknown>) {
  await mkdir(evidenceDirectory, { recursive: true });
  const path = resolve(evidenceDirectory, 'TASK-025-action-counts.json');
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
  } catch {
    existing = {};
  }
  await writeFile(path, JSON.stringify({ ...existing, ...entry }, null, 2), 'utf8');
}

test.describe('local MVP core paths', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page);
    await enterLocalMode(page);
  });

  // REQ-028-AC-001
  test('new bookmark path completes within three primary actions', async ({ page }) => {
    const actions = new PrimaryActionCounter();
    await openNewBookmark(page, actions);

    await page.getByRole('textbox', { name: 'Bookmark URL' }).fill('https://example.test/mvp-new');
    await page.getByLabel('Bookmark title hint').fill('MVP New Bookmark');
    await actions.click(page.getByRole('button', { name: 'Smart' }));
    await expect(page.getByRole('button', { name: 'Save bookmark' })).toBeVisible();
    await actions.click(page.getByRole('button', { name: 'Save bookmark' }));

    await expect(page.getByRole('main', { name: 'Content Area' }).getByText('MVP New Bookmark')).toBeVisible();
    expect(actions.count).toBeLessThanOrEqual(3);

    await mergeActionCount({
      'REQ-028-AC-001': { path: 'new-bookmark', primaryActions: actions.count, limit: 3 },
    });
  });

  // REQ-028-AC-002
  test('spotlight open existing bookmark within three primary actions', async ({ page }) => {
    const actions = new PrimaryActionCounter();
    await actions.click(page.getByRole('button', { name: 'Search', exact: true }));
    await expect(page.getByRole('dialog', { name: 'Spotlight' })).toBeVisible();

    await page.getByLabel('Spotlight search').fill('Coolors');
    const result = page.getByRole('option', { name: /Coolors/i }).first();
    await expect(result).toBeVisible();
    await actions.click(result);

    await expect(page.getByRole('dialog', { name: 'Spotlight' })).toHaveCount(0);
    await expect(page.getByLabel('Edit bookmark title')).toContainText(/Coolors/i);
    expect(actions.count).toBeLessThanOrEqual(3);

    await mergeActionCount({
      'REQ-028-AC-002': { path: 'spotlight-open', primaryActions: actions.count, limit: 3 },
    });
  });

  // REQ-028-AC-003
  test('organize bookmark with tag within three primary actions', async ({ page }) => {
    const actions = new PrimaryActionCounter();
    const tagInput = page.getByLabel('Add tag');
    await tagInput.fill('MVP Organize Tag');
    await actions.press(page, 'Enter');

    await expect(page.getByLabel('Bookmark tags').getByText('MVP Organize Tag', { exact: true })).toBeVisible();
    expect(actions.count).toBeLessThanOrEqual(3);

    await mergeActionCount({
      'REQ-028-AC-003': { path: 'organize-tag', primaryActions: actions.count, limit: 3 },
    });
  });
});
