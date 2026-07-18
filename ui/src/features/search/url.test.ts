import { describe, expect, test } from 'vitest';
import { detectSpotlightHttpUrl, normalizeSpotlightUrl } from './url';

describe('features/search · URL 检测', () => {
  // REQ-017-AC-004：仅有效 http/https 触发 New Bookmark。
  test('detectSpotlightHttpUrl 仅接受 http 与 https', () => {
    expect(detectSpotlightHttpUrl('https://example.test/path')).toBe(true);
    expect(detectSpotlightHttpUrl('http://localhost:3000')).toBe(true);
    expect(detectSpotlightHttpUrl('example.test/path')).toBe(false);
    expect(detectSpotlightHttpUrl('ftp://files.test')).toBe(false);
    expect(detectSpotlightHttpUrl('javascript:alert(1)')).toBe(false);
    expect(detectSpotlightHttpUrl('react')).toBe(false);
  });

  test('normalizeSpotlightUrl 规范化有效 URL', () => {
    expect(normalizeSpotlightUrl('https://Example.TEST/a')).toEqual({
      ok: true,
      url: 'https://example.test/a',
    });
    expect(normalizeSpotlightUrl('not-a-url')).toEqual({ ok: false });
  });
});
