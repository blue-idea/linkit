import {
  isHttpFaviconValue,
  normalizeDomainFavicon,
  normalizeDomainFaviconColor,
} from '../../domain/bookmark-icon';
import type { Bookmark as DomainBookmark } from '../../domain/library';
import type { TagColor } from '../../types';
import { buildBookmarkTextGlyph, defaultBookmarkIconColor } from './icon';

/** UI 书签图标字段 → 领域书签（REQ-006-AC-007）。 */
export function bookmarkIconToDomain(ui: { favicon: string; faviconColor: TagColor }): {
  favicon: string | null;
  faviconColor: TagColor;
} {
  return {
    favicon: normalizeDomainFavicon(ui.favicon),
    faviconColor: normalizeDomainFaviconColor(ui.faviconColor),
  };
}

/** 领域书签图标字段 → UI 展示（REQ-006-AC-007）。 */
export function bookmarkIconToUi(bookmark: Pick<DomainBookmark, 'favicon' | 'faviconColor' | 'title' | 'domain'>): {
  favicon: string;
  faviconColor: TagColor;
} {
  const stored = bookmark.favicon;
  if (typeof stored === 'string' && stored.trim()) {
    if (isHttpFaviconValue(stored)) {
      return {
        favicon: stored.trim(),
        faviconColor: normalizeDomainFaviconColor(bookmark.faviconColor),
      };
    }
    const glyph = normalizeDomainFavicon(stored);
    if (glyph) {
      return {
        favicon: glyph,
        faviconColor: normalizeDomainFaviconColor(bookmark.faviconColor),
      };
    }
  }
  const domain = bookmark.domain || 'unknown';
  return {
    favicon: buildBookmarkTextGlyph(domain, bookmark.title),
    faviconColor: bookmark.faviconColor
      ? normalizeDomainFaviconColor(bookmark.faviconColor)
      : defaultBookmarkIconColor(domain),
  };
}
