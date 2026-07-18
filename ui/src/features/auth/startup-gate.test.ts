import { describe, expect, test } from 'vitest';
import { resolveStartupView } from './startup-gate';
import { applySeedRestore, shouldConfirmSeedRestore } from './seed-restore';

describe('启动门控', () => {
  // REQ-001-AC-005：引导未完成时只能显示 loading，禁止闪登录/主界面。
  test('resolveStartupView 在 bootstrap 未完成时返回 loading', () => {
    expect(resolveStartupView({ authLoading: true, bootstrapPhase: null, sessionMode: 'signed_out', recoveryPending: false })).toBe('loading');
    expect(resolveStartupView({ authLoading: false, bootstrapPhase: null, sessionMode: 'signed_out', recoveryPending: false })).toBe('loading');
  });

  test('resolveStartupView 按会话与恢复状态选择 login/main/recovery', () => {
    expect(resolveStartupView({ authLoading: false, bootstrapPhase: 'ready', sessionMode: 'signed_out', recoveryPending: false })).toBe('login');
    expect(resolveStartupView({ authLoading: true, bootstrapPhase: 'ready', sessionMode: 'signed_out', recoveryPending: false })).toBe('loading');
    expect(resolveStartupView({ authLoading: true, bootstrapPhase: 'ready', sessionMode: 'local', recoveryPending: false })).toBe('main');
    expect(resolveStartupView({ authLoading: false, bootstrapPhase: 'recovery_required', sessionMode: 'local', recoveryPending: true })).toBe('recovery');
  });
});

describe('种子恢复确认', () => {
  // REQ-002-AC-004：存在本机数据时必须二次确认。
  test('shouldConfirmSeedRestore 仅在有本机数据时为 true', () => {
    expect(shouldConfirmSeedRestore(true)).toBe(true);
    expect(shouldConfirmSeedRestore(false)).toBe(false);
  });

  test('applySeedRestore 在未确认且有数据时返回 blocked', () => {
    expect(applySeedRestore({ hasLocalData: true, confirmed: false })).toBe('blocked');
    expect(applySeedRestore({ hasLocalData: true, confirmed: true })).toBe('applied');
    expect(applySeedRestore({ hasLocalData: false, confirmed: false })).toBe('applied');
  });
});
