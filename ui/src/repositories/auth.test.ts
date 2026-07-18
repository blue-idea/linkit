import { describe, expect, it, vi } from 'vitest';
import { AUTH_CONFIG } from '../config/auth';
import { createAuthRepository, type AuthClient } from './auth';
import { RepositoryError } from './types';

function createMockClient(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    getSession: vi.fn(async () => ({ session: null, error: null })),
    onAuthStateChange: vi.fn(() => () => undefined),
    signUp: vi.fn(async () => ({ session: null, user: null, error: null })),
    signInWithPassword: vi.fn(async () => ({ session: null, user: null, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    ...overrides,
  };
}

const sampleSession = {
  userId: '11111111-1111-1111-1111-111111111111',
  email: 'user-a@linkit.test',
};

describe('AuthRepository', () => {
  // REQ-001-AC-004：getSession 恢复已有会话。
  it('getSession 在存在会话时返回标准化 AuthSession', async () => {
    const client = createMockClient({
      getSession: vi.fn(async () => ({
        session: { user: { id: sampleSession.userId, email: sampleSession.email } },
        error: null,
      })),
    });
    const repo = createAuthRepository({ client });
    await expect(repo.getSession()).resolves.toEqual(sampleSession);
  });

  // REQ-001-AC-001：有效凭据登录成功。
  it('signInWithPassword 成功时返回 AuthSession', async () => {
    const client = createMockClient({
      signInWithPassword: vi.fn(async () => ({
        session: { user: { id: sampleSession.userId, email: sampleSession.email } },
        user: { id: sampleSession.userId, email: sampleSession.email },
        error: null,
      })),
    });
    const repo = createAuthRepository({ client });
    await expect(repo.signInWithPassword('user-a@linkit.test', 'secret')).resolves.toEqual(sampleSession);
  });

  // REQ-001-AC-003：无效凭据映射为稳定 AppError。
  it('signInWithPassword 失败时抛出 AUTH_INVALID_CREDENTIALS', async () => {
    const client = createMockClient({
      signInWithPassword: vi.fn(async () => ({
        session: null,
        user: null,
        error: { message: 'Invalid login credentials', status: 400 },
      })),
    });
    const repo = createAuthRepository({ client });
    await expect(repo.signInWithPassword('bad@example.test', 'wrong')).rejects.toMatchObject({
      code: AUTH_CONFIG.errors.invalidCredentials.code,
      message: AUTH_CONFIG.errors.invalidCredentials.message,
      retryable: false,
    });
  });

  // REQ-001-AC-002：注册返回 session 时进入已认证结果。
  it('signUp 返回 session 时状态为 authenticated', async () => {
    const client = createMockClient({
      signUp: vi.fn(async () => ({
        session: { user: { id: sampleSession.userId, email: sampleSession.email } },
        user: { id: sampleSession.userId, email: sampleSession.email },
        error: null,
      })),
    });
    const repo = createAuthRepository({ client });
    await expect(repo.signUp('user-a@linkit.test', 'secret')).resolves.toEqual({
      status: 'authenticated',
      session: sampleSession,
    });
  });

  // REQ-001-AC-006：注册成功但无 session → Check your email。
  it('signUp 无 session 时状态为 email_confirmation_required', async () => {
    const client = createMockClient({
      signUp: vi.fn(async () => ({
        session: null,
        user: { id: sampleSession.userId, email: sampleSession.email },
        error: null,
      })),
    });
    const repo = createAuthRepository({ client });
    await expect(repo.signUp('new@example.test', 'secret')).resolves.toEqual({
      status: 'email_confirmation_required',
    });
  });

  // REQ-002-AC-003：signOut 清除会话。
  it('signOut 调用底层并成功完成', async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    const repo = createAuthRepository({ client: createMockClient({ signOut }) });
    await expect(repo.signOut()).resolves.toBeUndefined();
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('未配置客户端时操作抛出 AUTH_NOT_CONFIGURED', async () => {
    const repo = createAuthRepository({ client: null });
    await expect(repo.getSession()).rejects.toBeInstanceOf(RepositoryError);
    await expect(repo.getSession()).rejects.toMatchObject(AUTH_CONFIG.errors.notConfigured);
  });

  it('onAuthStateChange 将底层会话映射后回调', () => {
    let listener: ((session: { user: { id: string; email?: string | null } } | null) => void) | undefined;
    const client = createMockClient({
      onAuthStateChange: vi.fn((cb) => {
        listener = cb;
        return () => undefined;
      }),
    });
    const repo = createAuthRepository({ client });
    const received: unknown[] = [];
    const unsubscribe = repo.onAuthStateChange((session) => received.push(session));
    listener?.({ user: { id: sampleSession.userId, email: sampleSession.email } });
    listener?.(null);
    expect(received).toEqual([sampleSession, null]);
    unsubscribe();
  });
});
