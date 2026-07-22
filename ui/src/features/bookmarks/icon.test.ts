import { describe, expect, test } from 'vitest';
import { isBookmarkFaviconImage, randomBookmarkIconColor, resolveBookmarkIcon, BOOKMARK_ICON_COLORS } from './icon';

describe('resolveBookmarkIcon', () => {
  test('有图片地址时优先返回图片图标', () => {
    const result = resolveBookmarkIcon({
      url: 'https://example.test/post',
      title: 'Example',
      faviconUrl: 'https://cdn.example.test/favicon.png',
    });
    expect(result.favicon).toBe('https://cdn.example.test/favicon.png');
  });

  test('无图片地址时回退首字母图标并生成稳定颜色', () => {
    const first = resolveBookmarkIcon({
      url: 'https://example.test/post',
      title: 'Example',
      faviconUrl: null,
    });
    const second = resolveBookmarkIcon({
      url: 'https://example.test/another',
      title: 'Else',
      faviconUrl: '',
    });
    expect(first.favicon).toBe('E');
    expect(first.faviconColor).toBe(second.faviconColor);
  });

  test('可覆盖文字图标背景色', () => {
    const result = resolveBookmarkIcon({
      url: 'https://example.test',
      title: 'Example',
      faviconUrl: null,
      faviconColor: 'coral',
    });
    expect(result.favicon).toBe('E');
    expect(result.faviconColor).toBe('coral');
  });

  test('randomBookmarkIconColor 从调色板选取', () => {
    expect(BOOKMARK_ICON_COLORS).toContain(randomBookmarkIconColor(() => 0));
    expect(BOOKMARK_ICON_COLORS).toContain(randomBookmarkIconColor(() => 0.99));
  });

  test('isBookmarkFaviconImage 识别 http 与 data 图片', () => {
    expect(isBookmarkFaviconImage('https://a.test/x.png')).toBe(true);
    expect(isBookmarkFaviconImage('data:image/png;base64,abc')).toBe(true);
    expect(isBookmarkFaviconImage('A')).toBe(false);
  });
});
