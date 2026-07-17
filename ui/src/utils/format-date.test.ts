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

  it('[单元] 当年日期 shall 显示为月日格式', () => {
    expect(formatDate('2026-03-05T08:00:00.000Z')).toBe('3月5日');
  });

  it('[单元] 非当年日期 shall 显示为年/月/日格式', () => {
    expect(formatDate('2025-12-31T08:00:00.000Z')).toBe('2025/12/31');
  });
});
