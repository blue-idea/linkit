import { useEffect, useState, useCallback, useMemo } from 'react';
import { createAuthRepository, type AuthSession, type SignUpResult } from './repositories/auth';
import { createSupabaseAuthClient } from './repositories/supabase-auth-client';
import { isSupabaseConfigured, supabase } from './supabase';
import { RepositoryError } from './repositories/types';

export interface AuthState {
  user: { id: string; email: string | null } | null;
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; result: SignUpResult | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof RepositoryError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Authentication request failed';
}

export function useAuth(): AuthState {
  const repository = useMemo(
    () => createAuthRepository({ client: createSupabaseAuthClient(supabase) }),
    []
  );
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 无 Supabase 配置时立即结束加载，保证本地模式登录门可用（含 CI E2E）。
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    repository
      .getSession()
      .then((next) => {
        if (!mounted) return;
        setSession(next);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(toErrorMessage(err));
        setLoading(false);
      });

    let unsubscribe: () => void = () => undefined;
    try {
      unsubscribe = repository.onAuthStateChange((next) => {
        setSession(next);
      });
    } catch (err) {
      setError(toErrorMessage(err));
      setLoading(false);
    }

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [repository]);

  const signUp = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const result = await repository.signUp(email, password);
        if (result.status === 'authenticated') {
          setSession(result.session);
        }
        return { error: null, result };
      } catch (err) {
        const message = toErrorMessage(err);
        setError(message);
        return { error: message, result: null };
      }
    },
    [repository]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const next = await repository.signInWithPassword(email, password);
        setSession(next);
        return { error: null };
      } catch (err) {
        const message = toErrorMessage(err);
        setError(message);
        return { error: message };
      }
    },
    [repository]
  );

  const signOut = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        await repository.signOut();
      }
    } catch {
      // 退出时仍清除本地会话视图，避免卡在已认证界面。
    }
    setSession(null);
  }, [repository]);

  return {
    user: session ? { id: session.userId, email: session.email } : null,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
  };
}
