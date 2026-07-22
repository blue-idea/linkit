import { describe, expect, test } from 'vitest';
import { buildExportEnvelopeFromUi } from '../import-export';
import { toUiLibraryFromEnvelope } from '../import-export/apply';
import type { Bookmark, LibraryData } from '../../types';
import { bookmarkIconToDomain, bookmarkIconToUi } from './icon-persistence';

const baseBookmark: Bookmark = {
  id: 'b-1',
  title: 'Example',
  url: 'https://example.test',
  domain: 'example.test',
  favicon: 'E',
  faviconColor: 'coral',
  description: '',
  notes: '',
  tags: [],
  categoryId: '',
  collectionIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  lastVisitedAt: null,
  visitCount: 0,
  starred: false,
  pinned: false,
  readStatus: 'unread',
  health: 'ok',
};

describe('bookmark icon persistence', () => {
  test('glyph 与背景色写入领域后可 round-trip', () => {
    const domain = bookmarkIconToDomain({ favicon: '⚛️', faviconColor: 'violet' });
    expect(domain).toEqual({ favicon: '⚛️', faviconColor: 'violet' });
    const ui = bookmarkIconToUi({
      favicon: domain.favicon,
      faviconColor: domain.faviconColor,
      title: baseBookmark.title,
      domain: baseBookmark.domain,
    });
    expect(ui).toEqual({ favicon: '⚛️', faviconColor: 'violet' });
  });

  test('超过 8 码点的 glyph 不入库', () => {
    const longGlyph = 'abcdefghi';
    expect(bookmarkIconToDomain({ favicon: longGlyph, faviconColor: 'blue' }).favicon).toBeNull();
  });

  test('http favicon URL 保留', () => {
    const url = 'https://cdn.example.test/icon.ico';
    const domain = bookmarkIconToDomain({ favicon: url, faviconColor: 'green' });
    expect(domain.favicon).toBe(url);
    expect(bookmarkIconToUi({ ...domain, title: 'T', domain: 'example.test' }).favicon).toBe(url);
  });

  test('UI → 信封 → UI 保持图标字段', () => {
    const library: LibraryData = {
      bookmarks: [baseBookmark],
      categories: [],
      collections: [],
      tags: [],
    };
    const envelope = buildExportEnvelopeFromUi(library, { now: '2026-07-22T00:00:00.000Z' });
    const stored = envelope.data.bookmarks[0];
    expect(stored?.favicon).toBe('E');
    expect(stored?.faviconColor).toBe('coral');

    const restored = toUiLibraryFromEnvelope({
      format: envelope.format,
      schemaVersion: envelope.schemaVersion,
      revision: envelope.revision,
      updatedAt: envelope.updatedAt,
      data: envelope.data,
    });
    expect(restored.bookmarks[0]).toMatchObject({ favicon: 'E', faviconColor: 'coral' });
  });
});
