import { AUTH_CONFIG } from '../config/auth';
import { RepositoryError, type AppError } from './types';

export interface AuthSession {
  userId: string;
  email: string | null;
}

export type SignUpResult =
  | { status: 'authenticated'; session: AuthSession }
  | { status: 'email_confirmation_required' };

/** 可注入的 Auth 客户端抽象，便于单测与真实 Supabase 适配。 */
export interface AuthClient {
  getSession(): Promise<{
    session: { user: { id: string; email?: string | null } } | null;
    error: { message: string; status?: number } | null;
  }>;
  onAuthStateChange(
    callback: (session: { user: { id: string; email?: string | null } } | null) => void
  ): () => void;
  signUp(
    email: string,
    password: string
  ): Promise<{
    session: { user: { id: string; email?: string | null } } | null;
    user: { id: string; email?: string | null } | null;
    error: { message: string; status?: number } | null;
  }>;
  signInWithPassword(
    email: string,
    password: string
  ): Promise<{
    session: { user: { id: string; email?: string | null } } | null;
    user: { id: string; email?: string | null } | null;
    error: { message: string; status?: number } | null;
  }>;
  signOut(): Promise<{ error: { message: string; status?: number } | null }>;
}

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void;
  signUp(email: string, password: string): Promise<SignUpResult>;
  signInWithPassword(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
}

function toAuthSession(user: { id: string; email?: string | null } | null | undefined): AuthSession | null {
  if (!user?.id) return null;
  return { userId: user.id, email: user.email ?? null };
}

function mapAuthError(error: { message: string; status?: number } | null | undefined): AppError {
  const message = error?.message?.trim() || AUTH_CONFIG.errors.requestFailed.message;
  const normalized = message.toLowerCase();
  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid credentials') ||
    normalized.includes('email not confirmed')
  ) {
    return {
      ...AUTH_CONFIG.errors.invalidCredentials,
      message: AUTH_CONFIG.errors.invalidCredentials.message,
      details: { providerMessage: message },
    };
  }
  return {
    ...AUTH_CONFIG.errors.requestFailed,
    message,
    details: { status: error?.status ?? null },
  };
}

class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly client: AuthClient | null) {}

  private requireClient(): AuthClient {
    if (!this.client) {
      throw new RepositoryError({ ...AUTH_CONFIG.errors.notConfigured });
    }
    return this.client;
  }

  async getSession(): Promise<AuthSession | null> {
    const client = this.requireClient();
    const { session, error } = await client.getSession();
    if (error) throw new RepositoryError(mapAuthError(error));
    return toAuthSession(session?.user);
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    const client = this.requireClient();
    return client.onAuthStateChange((session) => {
      callback(toAuthSession(session?.user ?? null));
    });
  }

  async signUp(email: string, password: string): Promise<SignUpResult> {
    const client = this.requireClient();
    const { session, user, error } = await client.signUp(email, password);
    if (error) throw new RepositoryError(mapAuthError(error));
    const authSession = toAuthSession(session?.user ?? user);
    if (session && authSession) {
      return { status: 'authenticated', session: authSession };
    }
    // REQ-001-AC-006：注册成功但无 session → 邮箱确认分支。
    return { status: 'email_confirmation_required' };
  }

  async signInWithPassword(email: string, password: string): Promise<AuthSession> {
    const client = this.requireClient();
    const { session, user, error } = await client.signInWithPassword(email, password);
    if (error) throw new RepositoryError(mapAuthError(error));
    const authSession = toAuthSession(session?.user ?? user);
    if (!authSession) {
      throw new RepositoryError(mapAuthError({ message: 'No session returned' }));
    }
    return authSession;
  }

  async signOut(): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.signOut();
    if (error) throw new RepositoryError(mapAuthError(error));
  }
}

export function createAuthRepository(options: { client: AuthClient | null }): AuthRepository {
  return new SupabaseAuthRepository(options.client);
}
