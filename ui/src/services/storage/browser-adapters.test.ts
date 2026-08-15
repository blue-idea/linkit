import { beforeEach, describe, expect, test } from 'vitest';
import { BROWSER_STORAGE_KEYS } from '../../config/storage';
import { createBrowserStorageAdapters } from './browser-adapters';

describe('浏览器存储适配器数据根读取', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // REQ-029-AC-003：选择 Keep target data 后，浏览器 E2E 替身应从新数据根读取目标库。
  test('当前数据根存在目标库时优先读取目标目录数据', async () => {
    const sourceLibrary = { bookmarks: [{ id: 'source-bookmark', title: 'Source bookmark', url: 'https://source.test' }] };
    const targetLibrary = { bookmarks: [{ id: 'target-bookmark', title: 'Target bookmark', url: 'https://target.test' }] };
    localStorage.setItem(BROWSER_STORAGE_KEYS.legacyLibrary, JSON.stringify(sourceLibrary));
    localStorage.setItem(BROWSER_STORAGE_KEYS.dataRoot, 'D:\\Occupied');
    localStorage.setItem('linkit.data-root.v1:D:\\Occupied:lattice.library', JSON.stringify(targetLibrary));

    const loaded = await createBrowserStorageAdapters().loadLibrary();

    expect(loaded.state).toBe('found');
    if (loaded.state !== 'found') return;
    expect(loaded.snapshot.envelope.data.bookmarks[0]?.title).toBe('Target bookmark');
  });
});
