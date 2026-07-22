import type { TagColor } from '../../types';
import {
  buildBookmarkTextGlyph,
  defaultBookmarkIconColor,
  isBookmarkImageSrc,
  randomBookmarkIconColor,
  resolveBookmarkIcon,
} from './icon';

export type BookmarkIconEditorMode = 'site' | 'text';

export type BookmarkIconEditorValue = {
  mode: BookmarkIconEditorMode;
  /** 元数据或已保存的网站 favicon URL；mode=site 时入库用。 */
  siteFaviconUrl: string | null;
  /** Go 抓取的 data URL 或 http，用于 WebView 预览网站图标。 */
  siteFaviconPreview: string | null;
  /** 文字图标自定义 glyph；空则按标题/域名首字母。 */
  glyphOverride: string;
  faviconColor: TagColor;
};

export function canUseSiteFaviconIcon(siteFaviconUrl: string | null | undefined): boolean {
  const trimmed = siteFaviconUrl?.trim() ?? '';
  return /^https?:\/\//i.test(trimmed);
}

/** 新建书签：有 favicon URL 或已抓取到图标数据时默认网站图标，否则文字图标。 */
export function initialIconEditorForNewBookmark(input: {
  url: string;
  faviconUrl: string | null;
  faviconDataUrl: string | null;
}): BookmarkIconEditorValue {
  const siteFaviconUrl = input.faviconUrl;
  const siteFaviconPreview = input.faviconDataUrl ?? input.faviconUrl;
  const hasSiteIcon =
    canUseSiteFaviconIcon(siteFaviconUrl) ||
    Boolean(siteFaviconPreview?.trim().startsWith('data:image/'));

  if (hasSiteIcon) {
    return {
      mode: 'site',
      siteFaviconUrl,
      siteFaviconPreview,
      glyphOverride: '',
      faviconColor: defaultBookmarkIconColor(input.url),
    };
  }

  return {
    mode: 'text',
    siteFaviconUrl: null,
    siteFaviconPreview: null,
    glyphOverride: '',
    faviconColor: randomBookmarkIconColor(),
  };
}

/** 解析编辑器当前预览/保存用的 favicon 与背景色。 */
export function resolveIconEditorIcon(input: {
  url: string;
  title: string;
  value: BookmarkIconEditorValue;
}): { favicon: string; faviconColor: TagColor } {
  const { url, title, value } = input;
  if (value.mode === 'site' && canUseSiteFaviconIcon(value.siteFaviconUrl)) {
    return resolveBookmarkIcon({
      url,
      title,
      faviconUrl: value.siteFaviconUrl,
      faviconColor: value.faviconColor,
    });
  }
  const glyph =
    value.glyphOverride.trim() ||
    buildBookmarkTextGlyph(
      url.replace(/^https?:\/\//, '').split('/')[0] || 'unknown',
      title
    );
  const clipped = [...glyph].slice(0, 8).join('');
  return { favicon: clipped || '?', faviconColor: value.faviconColor };
}

/** 从已保存书签初始化编辑器状态。 */
export function bookmarkIconEditorFromBookmark(bookmark: {
  url: string;
  title: string;
  favicon: string;
  faviconColor: TagColor;
}): BookmarkIconEditorValue {
  if (isBookmarkImageSrc(bookmark.favicon) && /^https?:\/\//i.test(bookmark.favicon)) {
    return {
      mode: 'site',
      siteFaviconUrl: bookmark.favicon,
      siteFaviconPreview: bookmark.favicon,
      glyphOverride: '',
      faviconColor: bookmark.faviconColor,
    };
  }
  return {
    mode: 'text',
    siteFaviconUrl: null,
    siteFaviconPreview: null,
    glyphOverride: bookmark.favicon,
    faviconColor: bookmark.faviconColor,
  };
}
