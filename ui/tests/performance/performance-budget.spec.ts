import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generatePerformanceLibrary } from '../../src/testing/performance-data';
import { toUiLibraryFromEnvelope } from '../../src/features/import-export';

const sampleCount = 15;
const evidencePath = resolve('../docs/spec/evidence/TASK-041-performance-raw.json');

function percentile(samples: number[], ratio: number): number {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

function summary(samples: number[]) {
  return { samples, count: samples.length, p50: percentile(samples, 0.5), p95: percentile(samples, 0.95) };
}

test('10,000 条资料库满足正式构建性能预算', async ({ page, browserName }) => {
  test.setTimeout(180_000);
  const generated = toUiLibraryFromEnvelope(generatePerformanceLibrary({ bookmarkCount: 10_000, seed: 'task-041' }));
  // 浏览器 localStorage 配额小于桌面 AppData；保留本次旅程实际使用的全部查询字段。
  const library = {
    ...generated,
    bookmarks: generated.bookmarks.map((bookmark) => ({
      id: bookmark.id, title: bookmark.title, url: bookmark.url, domain: bookmark.domain,
      tags: bookmark.tags, categoryId: bookmark.categoryId, collectionIds: bookmark.collectionIds,
      createdAt: bookmark.createdAt, lastVisitedAt: bookmark.lastVisitedAt,
      visitCount: bookmark.visitCount, starred: bookmark.starred, pinned: bookmark.pinned,
      readStatus: bookmark.readStatus, health: bookmark.health,
    })),
  } as typeof generated;
  const settings = {
    settingsVersion: 1, storageMode: 'local', theme: 'midnight', locale: 'en',
    ai: { apiBase: '', model: '' }, aiConsent: null,
    view: { defaultMode: 'card' }, lastCloudRevision: null,
  };
  await page.addInitScript(({ libraryData, appSettings }) => {
    localStorage.setItem('linkit.settings.v1', JSON.stringify(appSettings));
    localStorage.setItem('lattice.library', JSON.stringify(libraryData));
  }, { libraryData: library, appSettings: settings });

  const startup: number[] = [];
  for (let index = 0; index < 5; index += 1) {
    const started = performance.now();
    await page.goto('/');
    await expect(page.getByRole('main', { name: 'Content Area' })).toBeVisible();
    await expect(page.locator('[data-view-item]').first()).toBeVisible();
    startup.push(performance.now() - started);
  }

  const search: number[] = [];
  const filter: number[] = [];
  const viewSwitch: number[] = [];
  const searchBox = page.getByRole('main', { name: 'Content Area' }).getByRole('textbox').first();
  const readFilter = page.getByRole('combobox', { name: 'Filter by read status' });
  const setSearch = (value: string) => searchBox.evaluate((element, nextValue) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(element, nextValue);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  const measureViewSwitch = (buttonName: string, targetView: string) => page.evaluate(({ buttonName: name, targetView: view }) => new Promise<number>((resolveMeasurement, reject) => {
    const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
    if (!button) {
      reject(new Error(`View button ${name} was not found`));
      return;
    }
    const started = performance.now();
    button.click();
    const inspect = () => {
      if (document.querySelector(`[data-view-item="${view}"]`)) {
        requestAnimationFrame(() => resolveMeasurement(performance.now() - started));
        return;
      }
      requestAnimationFrame(inspect);
    };
    requestAnimationFrame(inspect);
  }), { buttonName, targetView });
  for (let index = 0; index < sampleCount; index += 1) {
    let started = performance.now();
    await setSearch(index % 2 === 0 ? 'Performance bookmark 9999' : 'Performance bookmark 8888');
    await expect(page.locator('[data-view-item]').first()).toBeVisible();
    search.push(performance.now() - started);
    await setSearch('');
    await expect(page.getByText(/10000 个收藏/)).toBeVisible();

    started = performance.now();
    await readFilter.selectOption(index % 2 === 0 ? 'read' : 'unread');
    await expect(page.getByText(/2500 个收藏/)).toBeVisible();
    filter.push(performance.now() - started);
    await readFilter.selectOption('all');
    await expect(page.getByText(/10000 个收藏/)).toBeVisible();

    viewSwitch.push(await measureViewSwitch(index % 2 === 0 ? 'List view' : 'Card view', index % 2 === 0 ? 'list' : 'card'));
  }

  const save = await page.evaluate(({ data, count }) => {
    const durations: number[] = [];
    for (let index = 0; index < count; index += 1) {
      const started = performance.now();
      localStorage.setItem('lattice.library', JSON.stringify(data));
      durations.push(performance.now() - started);
    }
    return durations;
  }, { data: library, count: sampleCount });

  await setSearch('');
  await page.route('**/e2e-health/**', async (route) => {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 800));
    await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: 'ok' });
  });
  await page.goto('/?e2eHealth=1');
  const healthButton = page.getByLabel('Detail Panel', { exact: true }).getByRole('button', { name: /链接正常|内容已更新|链接可能失效/ });
  await healthButton.click();
  const pendingStarted = performance.now();
  await page.getByRole('dialog', { name: 'Health check' }).getByRole('button', { name: 'Start scan' }).click();
  await expect(page.getByText(/Scanning/)).toBeVisible();
  const pending = performance.now() - pendingStarted;
  await page.getByRole('button', { name: 'Cancel scan' }).click();

  const report = {
    generatedAt: new Date().toISOString(), buildMode: 'vite-preview-production', browserName,
    dataset: { bookmarks: library.bookmarks.length },
    startup: summary(startup), search: summary(search), filter: summary(filter),
    viewSwitch: summary(viewSwitch), localSave: summary(save), networkPending: { milliseconds: pending },
  };
  await mkdir(resolve('../docs/spec/evidence'), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  expect(report.startup.p95).toBeLessThanOrEqual(2_000);
  expect(report.search.p95).toBeLessThanOrEqual(100);
  expect(report.filter.p95).toBeLessThanOrEqual(100);
  expect(report.viewSwitch.p95).toBeLessThanOrEqual(150);
  expect(report.localSave.p95).toBeLessThanOrEqual(500);
  expect(report.networkPending.milliseconds).toBeLessThanOrEqual(300);
});
