import type { TagColor } from '../../types';
import { pickRandomItem } from '../../utils/random-item';

export const BOOKMARK_ICON_COLORS: TagColor[] = ['blue', 'green', 'amber', 'coral', 'violet', 'gray'];

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function randomBookmarkIconColor(random: () => number = Math.random): TagColor {
  return pickRandomItem(BOOKMARK_ICON_COLORS, random) ?? 'blue';
}

export function isBookmarkImageSrc(value: string): boolean {
  const trimmed = value.trim();
  return isHttpUrl(trimmed) || /^data:image\//i.test(trimmed);
}

/** 书签 favicon 字段是否为远程图片 URL。 */
export function isBookmarkFaviconImage(favicon: string | null | undefined): boolean {
  return Boolean(favicon?.trim() && isBookmarkImageSrc(favicon));
}

function readDomain(url: string): string {
  try {
    const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url.trim())
      ? url.trim()
      : `https://${url.trim()}`;
    return new URL(withProtocol).hostname || 'unknown';
  } catch {
    return 'unknown';
  }
}

export function buildBookmarkTextGlyph(domain: string, title: string): string {
  const fromTitle = title.trim().charAt(0);
  const fromDomain = domain.trim().charAt(0);
  return (fromTitle || fromDomain || '?').toUpperCase();
}

function pickColor(seed: string): TagColor {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return BOOKMARK_ICON_COLORS[hash % BOOKMARK_ICON_COLORS.length] ?? 'blue';
}

export function defaultBookmarkIconColor(seed: string): TagColor {
  return pickColor(seed);
}

/**
 * 新建书签图标策略：优先使用可用图片；无图时回退文字图标并给出稳定背景色。
 */
export function resolveBookmarkIcon(input: {
  url: string;
  title: string;
  faviconUrl?: string | null;
  faviconColor?: TagColor | null;
}): { favicon: string; faviconColor: TagColor } {
  const domain = readDomain(input.url);
  const fallbackColor = input.faviconColor ?? pickColor(domain);
  const faviconUrl = input.faviconUrl?.trim() ?? '';
  if (faviconUrl && isHttpUrl(faviconUrl)) {
    return { favicon: faviconUrl, faviconColor: fallbackColor };
  }
  return {
    favicon: buildBookmarkTextGlyph(domain, input.title),
    faviconColor: fallbackColor,
  };
}
