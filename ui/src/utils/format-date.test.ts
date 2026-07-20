import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDate } from './format-date';

// REQ-028-AC-004：单元测试框架须能锚定 AC 并验证工具函数行为。
describe('formatDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('[单元] 当年日期 shall 按 locale 显示月日格式', () => {
    expect(formatDate('2026-03-05T08:00:00.000Z', 'zh')).toBe('3月5日');
    expect(formatDate('2026-03-05T08:00:00.000Z', 'en')).toBe('Mar 5');
  });

  it('[单元] 非当年日期 shall 按 locale 显示年份', () => {
    expect(formatDate('2025-12-31T08:00:00.000Z', 'zh')).toBe('2025年12月31日');
    expect(formatDate('2025-12-31T08:00:00.000Z', 'en')).toBe('Dec 31, 2025');
  });
});
