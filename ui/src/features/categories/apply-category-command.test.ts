import { describe, expect, test, vi } from 'vitest';
import {
  CATEGORY_COLOR_CANDIDATES,
  CATEGORY_ICON_CANDIDATES,
} from '../../config/category-icons';
import { runCreateCategory } from './apply-category-command';

describe('runCreateCategory', () => {
  test('新建分类时从受控候选集中随机生成图标与颜色', () => {
    const randomValue = 0.5;
    const random = vi
      .fn<() => number>()
      .mockReturnValueOnce(randomValue)
      .mockReturnValueOnce(randomValue);

    const result = runCreateCategory({
      bookmarks: [],
      categories: [],
      collections: [],
      tags: [],
      name: 'Random appearance',
      random,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.categories[0]).toMatchObject({
      icon: CATEGORY_ICON_CANDIDATES[
        Math.floor(CATEGORY_ICON_CANDIDATES.length * randomValue)
      ],
      color: CATEGORY_COLOR_CANDIDATES[
        Math.floor(CATEGORY_COLOR_CANDIDATES.length * randomValue)
      ],
    });
    expect(random).toHaveBeenCalledTimes(2);
  });
});
