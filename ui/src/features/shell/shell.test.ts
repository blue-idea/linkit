import { describe, expect, test } from 'vitest';
import { OVERLAY_PRIORITY, resolveTopOverlay } from './overlay-stack';
import { extractHttpUrlFromDropData } from './drop-url';

describe('features/shell · overlay-stack', () => {
  // REQ-024-AC-004：Esc 关闭最上层浮层。
  test('resolveTopOverlay 按优先级返回最上层打开的浮层', () => {
    expect(resolveTopOverlay({})).toBeNull();
    expect(
      resolveTopOverlay({
        settings: true,
        spotlight: true,
        'new-bookmark': false,
      })
    ).toBe('spotlight');
    expect(
      resolveTopOverlay({
        settings: true,
        insights: true,
      })
    ).toBe('insights');
    expect(OVERLAY_PRIORITY[0]).toBe('seed-confirm');
  });

  test('resolveTopOverlay 在仅 settings 打开时返回 settings', () => {
    expect(resolveTopOverlay({ settings: true })).toBe('settings');
  });
});

describe('features/shell · drop-url', () => {
  // REQ-024-AC-005：仅有效 http/https 触发入库。
  test('extractHttpUrlFromDropData 从 uri-list 与 plain 提取 http(s)', () => {
    expect(
      extractHttpUrlFromDropData({
        'text/uri-list': 'https://example.test/dropped',
        'text/plain': '',
      })
    ).toBe('https://example.test/dropped');

    expect(
      extractHttpUrlFromDropData({
        'text/uri-list': '',
        'text/plain': 'http://localhost:5173/x',
      })
    ).toBe('http://localhost:5173/x');

    expect(
      extractHttpUrlFromDropData({
        'text/uri-list': 'ftp://files.test',
        'text/plain': 'not a url',
      })
    ).toBeNull();
  });
});
