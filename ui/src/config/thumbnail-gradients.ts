export const THUMBNAIL_GRADIENTS = {
  blue: 'from-accent-600 via-accent-500 to-mint-500',
  green: 'from-mint-600 via-mint-500 to-accent-500',
  amber: 'from-amber-500 via-coral-400 to-coral-500',
  coral: 'from-coral-500 via-coral-400 to-amber-400',
  violet: 'from-violet2-500 via-violet2-400 to-accent-500',
  gray: 'from-ink-500 via-ink-400 to-ink-600',
} as const;

export type ThumbnailGradientKey = keyof typeof THUMBNAIL_GRADIENTS;

export const THUMBNAIL_GRADIENT_KEYS = Object.freeze(
  Object.keys(THUMBNAIL_GRADIENTS) as ThumbnailGradientKey[]
);

/** 将持久化键解析为渐变类；兼容旧数据中的未知或空键。 */
export function resolveThumbnailGradient(thumbnail?: string | null): string {
  if (!thumbnail) return THUMBNAIL_GRADIENTS.gray;
  if (!Object.prototype.hasOwnProperty.call(THUMBNAIL_GRADIENTS, thumbnail)) {
    return THUMBNAIL_GRADIENTS.gray;
  }
  return THUMBNAIL_GRADIENTS[thumbnail as ThumbnailGradientKey];
}
