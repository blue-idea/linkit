import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/spec/evidence'
);

type EntryModeWindow = Window &
  typeof globalThis & {
    __entryModeCalls: { metadata: number; ai: number };
    go: {
      metadata: {
        Service: {
          FetchMetadata: (request: { url: string }) => Promise<{
            title: string;
            description: string;
            contentText: string;
            faviconUrl: null;
            faviconDataUrl: null;
          }>;
        };
      };
      ai: {
        Service: {
          AnalyzeBookmark: () => Promise<{
            title: string;
            description: string;
            summary: string;
            suggestedCategoryId: null;
            suggestedTags: string[];
          }>;
        };
      };
    };
  };

async function installEntryModeServices(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const browserWindow = window as EntryModeWindow;
    browserWindow.__entryModeCalls = { metadata: 0, ai: 0 };
    browserWindow.go = {
      metadata: {
        Service: {
          FetchMetadata: async () => {
            browserWindow.__entryModeCalls.metadata += 1;
            return {
              title: 'Metadata preview title',
              description: 'Metadata preview description',
              contentText: 'Metadata preview content',
              faviconUrl: null,
              faviconDataUrl: null,
            };
          },
        },
      },
      ai: {
        Service: {
          AnalyzeBookmark: async () => {
            browserWindow.__entryModeCalls.ai += 1;
            return {
              title: 'Smart preview title',
              description: 'Smart preview description',
              summary: 'Smart preview summary',
              suggestedCategoryId: null,
              suggestedTags: [],
            };
          },
        },
      },
    };
  });
}

async function enterLocalMode(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Continue in local mode' }).click();
  await expect(page.getByText('Lattice', { exact: true })).toBeVisible();
}

test.describe('TASK-071 New Bookmark Manual 与 Smart', () => {
  test.beforeEach(async ({ page }) => {
    await installEntryModeServices(page);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterLocalMode(page);
    await mkdir(evidenceDirectory, { recursive: true });
  });

  // REQ-006-AC-001 / REQ-006-AC-009
  test('Manual shall skip AI while Smart and Enter preserve intelligent analysis', async ({ page }) => {
    await page.getByRole('button', { name: 'New', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'New Bookmark' });
    await expect(dialog.getByRole('button', { name: 'Manual' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Smart' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Analyze' })).toHaveCount(0);

    await dialog.screenshot({
      path: resolve(evidenceDirectory, 'TASK-071-entry-modes-actual.png'),
      animations: 'disabled',
    });
    await expect(dialog).toHaveScreenshot('TASK-071-entry-modes-baseline.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.08,
    });

    const urlInput = dialog.getByRole('textbox', { name: 'Bookmark URL' });
    await urlInput.fill('https://example.test/manual');
    await dialog.getByRole('button', { name: 'Manual' }).click();
    await expect(dialog.getByRole('button', { name: 'Save bookmark' })).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: 'Bookmark title' })).toHaveValue('Metadata preview title');
    expect(await page.evaluate(() => (window as EntryModeWindow).__entryModeCalls)).toEqual({ metadata: 1, ai: 0 });

    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    await dialog.getByRole('button', { name: 'Smart' }).click();
    await expect(dialog.getByRole('textbox', { name: 'Bookmark title' })).toHaveValue('Smart preview title');
    expect(await page.evaluate(() => (window as EntryModeWindow).__entryModeCalls)).toEqual({ metadata: 2, ai: 1 });

    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    await urlInput.press('Enter');
    await expect(dialog.getByRole('textbox', { name: 'Bookmark title' })).toHaveValue('Smart preview title');
    expect(await page.evaluate(() => (window as EntryModeWindow).__entryModeCalls)).toEqual({ metadata: 3, ai: 2 });
  });
});
