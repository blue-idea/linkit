import { describe, expect, it } from 'vitest';
import { resolveSupabaseConfigured } from './supabase';

// CI E2E 依赖：未配置云端时不得初始化客户端，否则 auth loading 会挂起。
describe('resolveSupabaseConfigured', () => {
  it('[单元] 缺少 URL 或 Key 时 shall 返回 false', () => {
    expect(resolveSupabaseConfigured(undefined, undefined)).toBe(false);
    expect(resolveSupabaseConfigured('https://example.supabase.co', undefined)).toBe(false);
    expect(resolveSupabaseConfigured(undefined, 'anon-key')).toBe(false);
    expect(resolveSupabaseConfigured('  ', 'anon-key')).toBe(false);
  });

  it('[单元] URL 与 Key 均存在时 shall 返回 true', () => {
    expect(resolveSupabaseConfigured('https://example.supabase.co', 'anon-key')).toBe(true);
  });
});
