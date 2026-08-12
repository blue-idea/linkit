import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ImportRestoreRequest } from '../features/import-export';
import type { AppSettings, LibraryData } from '../types';

const { exportDesktopFile } = vi.hoisted(() => ({
  exportDesktopFile: vi.fn(),
}));

vi.mock('../services/platform/export', () => ({
  exportDesktopFile,
}));

import { SettingsDialog } from './SettingsDialog';

const settings: AppSettings = {
  storageMode: 'local',
  theme: 'midnight',
  locale: 'en',
  ai: { apiBase: '', model: '' },
  aiConsent: null,
  uiSize: 'medium',
};

const library: LibraryData = {
  bookmarks: [
    {
      id: 'bookmark-existing',
      title: 'Existing',
      url: 'https://example.com/duplicate/',
      domain: 'example.com',
      favicon: 'E',
      faviconColor: 'blue',
      description: '',
      notes: '',
      tags: [],
      categoryId: '',
      collectionIds: [],
      createdAt: '2026-08-01T08:00:00.000Z',
      lastVisitedAt: null,
      visitCount: 0,
      starred: false,
      pinned: false,
      readStatus: 'unread',
    },
  ],
  categories: [],
  collections: [],
  tags: [],
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  exportDesktopFile.mockReset();
  vi.useRealTimers();
});

describe('SettingsDialog 浏览器书签 HTML 导入导出', () => {
  test('REQ-005-AC-001 点击 Export data 会调用桌面原生导出', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-08T08:00:00.000Z'));
    exportDesktopFile.mockResolvedValue({ state: 'saved', path: '/tmp/linkit-backup-2026-08-08.json' });
    render(
      <SettingsDialog
        open
        settings={settings}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={() => undefined}
        onSignOut={() => undefined}
      />,
    );

    screen.getByRole('button', { name: 'Export' }).click();

    expect(exportDesktopFile).toHaveBeenCalledWith({
      suggestedFileName: 'linkit-backup-2026-08-08.json',
      content: expect.stringContaining('"format": "linkit-backup"'),
      mimeType: 'application/json',
    });
  });

  test('REQ-035-AC-001 点击 Export browser bookmarks 会调用桌面原生导出', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-08T08:00:00.000Z'));
    exportDesktopFile.mockResolvedValue({ state: 'saved', path: '/tmp/linkit-bookmarks-2026-08-08.html' });
    render(
      <SettingsDialog
        open
        settings={settings}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={() => undefined}
        onSignOut={() => undefined}
      />,
    );

    screen.getByRole('button', { name: 'Export browser bookmarks' }).click();

    expect(exportDesktopFile).toHaveBeenCalledWith({
      suggestedFileName: 'linkit-bookmarks-2026-08-08.html',
      content: expect.stringContaining('<!DOCTYPE NETSCAPE-Bookmark-file-1>'),
      mimeType: 'text/html;charset=utf-8',
    });
  });

  test('导出失败时显示错误提示', async () => {
    const user = userEvent.setup();
    exportDesktopFile.mockRejectedValue(new Error('dialog failed'));
    render(
      <SettingsDialog
        open
        settings={settings}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={() => undefined}
        onSignOut={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Export browser bookmarks' }));

    expect(await screen.findByTestId('export-error')).toHaveTextContent('Unable to export file');
  });

  test('REQ-035-AC-002 导入浏览器 HTML 时先显示摘要，确认后才调用 onImport', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn<(request: ImportRestoreRequest) => Promise<void>>(async () => undefined);
    render(
      <SettingsDialog
        open
        settings={settings}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={onImport}
        onSignOut={() => undefined}
      />,
    );

    const html = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<TITLE>Bookmarks</TITLE>',
      '<H1>Bookmarks</H1>',
      '<DL><p>',
      '  <DT><H3>Tech</H3>',
      '  <DL><p>',
      '    <DT><A HREF="https://example.com/duplicate">Duplicate</A>',
      '    <DT><A HREF="https://react.dev/">React</A>',
      '  </DL><p>',
      '</DL><p>',
    ].join('\n');

    const input = screen.getByTestId('browser-import-file-input') as HTMLInputElement;
    await user.upload(input, new File([html], 'bookmarks.html', { type: 'text/html' }));

    expect(onImport).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog', { name: 'Import browser bookmarks?' })).toBeInTheDocument();
    expect(screen.getByTestId('import-summary')).toHaveTextContent(
      '1 folders · 2 bookmarks · 1 new · 1 skipped duplicates',
    );

    await user.click(screen.getByRole('button', { name: 'Import bookmarks' }));

    const request = onImport.mock.calls[0]?.[0] as ImportRestoreRequest | undefined;
    expect(request).toMatchObject({
      kind: 'library',
      snapshot: {
        settings,
        library: expect.objectContaining({
          bookmarks: expect.arrayContaining([
            expect.objectContaining({ url: 'https://example.com/duplicate/' }),
            expect.objectContaining({ url: 'https://react.dev/' }),
          ]),
          categories: expect.arrayContaining([
            expect.objectContaining({ name: 'Tech', parentId: null }),
          ]),
        }),
      },
      browserImport: {
        importedBookmarkIds: [expect.any(String)],
      },
    });
    expect(request?.browserImport).toBeDefined();
    expect(request?.snapshot.library.bookmarks.some((bookmark: { id: string }) =>
      request?.browserImport?.importedBookmarkIds.includes(bookmark.id) ?? false
    )).toBe(true);
  });

  // REQ-035-AC-010：导入增强期间保持对话框可见并显示可访问进度。
  test('导入时显示 metadata 阶段和 completed/total 进度', async () => {
    const user = userEvent.setup();
    let releaseImport!: () => void;
    const importDone = new Promise<void>((resolve) => {
      releaseImport = resolve;
    });
    const onImport = vi.fn(async (request: ImportRestoreRequest) => {
      const progress = (request.browserImport as typeof request.browserImport & {
        onProgress?: (value: { stage: string; completed: number; total: number }) => void;
      })?.onProgress;
      expect(progress).toBeTypeOf('function');
      progress?.({ stage: 'metadata', completed: 1, total: 2 });
      await importDone;
    });
    render(
      <SettingsDialog
        open
        settings={settings}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={onImport}
        onSignOut={() => undefined}
      />,
    );

    const html = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<DL><p>',
      '  <DT><A HREF="https://react.dev/">React</A>',
      '  <DT><A HREF="https://vite.dev/">Vite</A>',
      '</DL><p>',
    ].join('\n');
    const input = screen.getByTestId('browser-import-file-input') as HTMLInputElement;
    await user.upload(input, new File([html], 'bookmarks.html', { type: 'text/html' }));
    await user.click(screen.getByRole('button', { name: 'Import bookmarks' }));

    expect(await screen.findByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByTestId('import-progress-stage')).toHaveTextContent('Fetching metadata');
    expect(screen.getByTestId('import-progress-count')).toHaveTextContent('1 / 2');
    expect(screen.getByRole('dialog', { name: 'Import browser bookmarks?' })).toBeInTheDocument();

    releaseImport();
    await screen.findByText('Imported 2 bookmarks');
  });

  test('REQ-035-AC-003 全部为重复项时确认导入保持零副作用', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn(async () => undefined);
    render(
      <SettingsDialog
        open
        settings={settings}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={onImport}
        onSignOut={() => undefined}
      />,
    );

    const html = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<DL><p>',
      '  <DT><H3>Only duplicates</H3>',
      '  <DL><p><DT><A HREF="https://example.com/duplicate">Duplicate</A></DL><p>',
      '</DL><p>',
    ].join('\n');
    const input = screen.getByTestId('browser-import-file-input') as HTMLInputElement;
    await user.upload(input, new File([html], 'bookmarks.html', { type: 'text/html' }));

    const confirm = await screen.findByRole('dialog', { name: 'Import browser bookmarks?' });
    expect(screen.getByTestId('import-summary')).toHaveTextContent(
      '1 folders · 1 bookmarks · 0 new · 1 skipped duplicates',
    );
    await user.click(confirm.querySelector('button:last-of-type') as HTMLButtonElement);

    expect(onImport).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Import browser bookmarks?' })).not.toBeInTheDocument();
  });

  test('REQ-035-AC-005 非法浏览器 HTML 不应改动设置或资料库，并显示错误', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn(async () => undefined);
    render(
      <SettingsDialog
        open
        settings={settings}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={onImport}
        onSignOut={() => undefined}
      />,
    );

    const input = screen.getByTestId('browser-import-file-input') as HTMLInputElement;
    await user.upload(input, new File(['plain text only'], 'bookmarks.html', { type: 'text/html' }));

    expect(onImport).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Import file is invalid');
    expect(screen.queryByRole('dialog', { name: 'Import browser bookmarks?' })).not.toBeInTheDocument();
  });

  test('REQ-035-AC-001 浏览器书签文件选择器同时接受 html 与 htm 扩展名', () => {
    render(
      <SettingsDialog
        open
        settings={settings}
        user={null}
        library={library}
        onClose={() => undefined}
        onSave={() => undefined}
        onImport={() => undefined}
        onSignOut={() => undefined}
      />,
    );

    const input = screen.getByTestId('browser-import-file-input');
    const accepted = input.getAttribute('accept')?.split(',') ?? [];
    expect(accepted).toEqual(expect.arrayContaining(['.html', '.htm']));
  });
});
