import {
  THUMBNAIL_GRADIENT_KEYS,
  type ThumbnailGradientKey,
} from '../../config/thumbnail-gradients';
import { pickRandomItem } from '../../utils/random-item';

/** 从集中配置的渐变键中选择新书签缩略图。 */
export function randomBookmarkThumbnail(
  random: () => number = Math.random
): ThumbnailGradientKey {
  return pickRandomItem(THUMBNAIL_GRADIENT_KEYS, random) ?? 'blue';
}
