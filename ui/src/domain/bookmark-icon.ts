import type { TagColor } from '../types';

export const BOOKMARK_GLYPH_MAX_CODE_POINTS = 8;

const TAG_COLORS: TagColor[] = ['blue', 'green', 'amber', 'coral', 'violet', 'gray'];

export function isHttpFaviconValue(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/** 展示用 glyph：非 URL，码点数在 1~8 之间。 */
export function isGlyphFaviconValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || isHttpFaviconValue(trimmed)) return false;
  const points = [...trimmed];
  return points.length >= 1 && points.length <= BOOKMARK_GLYPH_MAX_CODE_POINTS;
}

/** 将任意输入规范为领域层可持久化的 favicon（URL、glyph 或 null）。 */
export function normalizeDomainFavicon(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (isHttpFaviconValue(trimmed)) return trimmed;
  return isGlyphFaviconValue(trimmed) ? trimmed : null;
}

export function normalizeDomainFaviconColor(raw: unknown): TagColor {
  return TAG_COLORS.includes(raw as TagColor) ? (raw as TagColor) : 'blue';
}
