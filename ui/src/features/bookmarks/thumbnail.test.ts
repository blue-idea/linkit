import { describe, expect, test } from 'vitest';
import * as thumbnailConfig from '../../config/thumbnail-gradients';
import * as bookmarkFeatures from './index';

type RandomBookmarkThumbnail = (random?: () => number) => string;
type ResolveThumbnailGradient = (thumbnail?: string | null) => string;

function randomThumbnailFeature(): RandomBookmarkThumbnail | undefined {
  return (bookmarkFeatures as { randomBookmarkThumbnail?: RandomBookmarkThumbnail })
    .randomBookmarkThumbnail;
}

function thumbnailGradientResolver(): ResolveThumbnailGradient | undefined {
  return (thumbnailConfig as { resolveThumbnailGradient?: ResolveThumbnailGradient })
    .resolveThumbnailGradient;
}

describe('randomBookmarkThumbnail', () => {
  // TASK-073 / REQ-006-AC-010：随机区间应覆盖示例数据中的全部渐变键。
  test('按随机区间选择六种已配置渐变键', () => {
    const selectThumbnail = randomThumbnailFeature();

    expect([
      selectThumbnail?.(() => 0),
      selectThumbnail?.(() => 0.2),
      selectThumbnail?.(() => 0.34),
      selectThumbnail?.(() => 0.5),
      selectThumbnail?.(() => 0.67),
      selectThumbnail?.(() => 0.99),
    ]).toEqual(['blue', 'green', 'amber', 'coral', 'violet', 'gray']);
  });

  // TASK-073 / REQ-006-AC-010：即使测试随机源越界，也不得返回未知键。
  test('将越界随机值限制到首尾渐变键', () => {
    const selectThumbnail = randomThumbnailFeature();

    expect(selectThumbnail?.(() => -1)).toBe('blue');
    expect(selectThumbnail?.(() => 2)).toBe('gray');
  });
});

describe('resolveThumbnailGradient', () => {
  // TASK-073 / REQ-006-AC-010：保存键与渲染配置必须复用同一映射。
  test('将有效键解析为对应渐变类', () => {
    expect(thumbnailGradientResolver()?.('violet')).toContain('from-violet2-500');
  });

  // 旧资料可能含未知键，渲染时应保持既有 gray 回退。
  test('未知或空键回退 gray 渐变', () => {
    const resolveGradient = thumbnailGradientResolver();

    expect(resolveGradient?.('legacy-key')).toBe(thumbnailConfig.THUMBNAIL_GRADIENTS.gray);
    expect(resolveGradient?.('__proto__')).toBe(thumbnailConfig.THUMBNAIL_GRADIENTS.gray);
    expect(resolveGradient?.('constructor')).toBe(thumbnailConfig.THUMBNAIL_GRADIENTS.gray);
    expect(resolveGradient?.('toString')).toBe(thumbnailConfig.THUMBNAIL_GRADIENTS.gray);
    expect(resolveGradient?.(null)).toBe(thumbnailConfig.THUMBNAIL_GRADIENTS.gray);
  });
});
