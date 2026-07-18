import { describe, expect, it } from 'vitest';
import { resolveSignUpNotice, shouldRestoreAuthenticatedSession } from './auth-flow';

describe('auth-flow', () => {
  // REQ-001-AC-006
  it('注册无 session 时返回 check_email 提示', () => {
    expect(resolveSignUpNotice({ status: 'email_confirmation_required' })).toBe('check_email');
    expect(
      resolveSignUpNotice({
        status: 'authenticated',
        session: { userId: 'u1', email: 'a@b.test' },
      })
    ).toBeNull();
  });

  // REQ-001-AC-004
  it('signed_out 且存在会话时应恢复认证主界面', () => {
    expect(
      shouldRestoreAuthenticatedSession({ userId: 'u1', email: 'a@b.test' }, 'signed_out')
    ).toBe(true);
    expect(
      shouldRestoreAuthenticatedSession({ userId: 'u1', email: 'a@b.test' }, 'local')
    ).toBe(false);
    expect(shouldRestoreAuthenticatedSession(null, 'signed_out')).toBe(false);
  });
});
