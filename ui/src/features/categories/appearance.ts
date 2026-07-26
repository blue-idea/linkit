import {
  CATEGORY_COLOR_CANDIDATES,
  CATEGORY_ICON_CANDIDATES,
  type CategoryColorName,
  type CategoryIconName,
} from '../../config/category-icons';
import { pickRandomItem } from '../../utils/random-item';

export interface CategoryAppearance {
  icon: CategoryIconName;
  color: CategoryColorName;
}

/** 从集中配置的候选集中独立生成新分类的图标与颜色。 */
export function randomCategoryAppearance(
  random: () => number = Math.random
): CategoryAppearance {
  return {
    icon: pickRandomItem(CATEGORY_ICON_CANDIDATES, random) ?? CATEGORY_ICON_CANDIDATES[0],
    color: pickRandomItem(CATEGORY_COLOR_CANDIDATES, random) ?? CATEGORY_COLOR_CANDIDATES[0],
  };
}
