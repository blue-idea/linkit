import type { TagColor } from '../../types';

const ICON_COLORS: TagColor[] = ['blue', 'green', 'amber', 'coral', 'violet', 'gray'];

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
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

function buildGlyph(domain: string, title: string): string {
  const fromTitle = title.trim().charAt(0);
  const fromDomain = domain.trim().charAt(0);
  return (fromTitle || fromDomain || '?').toUpperCase();
}

function pickColor(seed: string): TagColor {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return ICON_COLORS[hash % ICON_COLORS.length] ?? 'blue';
}

/**
 * 新建书签图标策略：优先使用可用图片；无图时回退文字图标并给出稳定背景色。
 */
export function resolveBookmarkIcon(input: {
  url: string;
  title: string;
  faviconUrl?: string | null;
}): { favicon: string; faviconColor: TagColor } {
  const domain = readDomain(input.url);
  const fallbackColor = pickColor(domain);
  const faviconUrl = input.faviconUrl?.trim() ?? '';
  if (faviconUrl && isHttpUrl(faviconUrl)) {
    return { favicon: faviconUrl, faviconColor: fallbackColor };
  }
  return {
    favicon: buildGlyph(domain, input.title),
    faviconColor: fallbackColor,
  };
}
