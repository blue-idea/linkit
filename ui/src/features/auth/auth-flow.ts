import type { AuthSession, SignUpResult } from '../../repositories/auth';

/**
 * REQ-001-AC-006：注册成功但无 session 时显示 Check your email。
 */
export function resolveSignUpNotice(result: SignUpResult | null): 'check_email' | null {
  if (result?.status === 'email_confirmation_required') return 'check_email';
  return null;
}

/**
 * REQ-001-AC-004：存在恢复会话且仍在 signed_out 时进入主界面。
 */
export function shouldRestoreAuthenticatedSession(
  session: AuthSession | null,
  sessionMode: 'signed_out' | 'local' | 'authenticated'
): boolean {
  return Boolean(session) && sessionMode === 'signed_out';
}
