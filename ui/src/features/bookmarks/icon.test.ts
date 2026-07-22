import { describe, expect, test } from 'vitest';
import { resolveBookmarkIcon } from './icon';

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
});
