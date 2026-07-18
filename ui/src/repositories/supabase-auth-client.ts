import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthClient } from '../repositories/auth';

/** 将 Supabase JS 客户端适配为 AuthRepository 可注入的 AuthClient。 */
export function createSupabaseAuthClient(client: SupabaseClient | null): AuthClient | null {
  if (!client) return null;

  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      return { session: data.session, error };
    },
    onAuthStateChange(callback) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        callback(session);
      });
      return () => data.subscription.unsubscribe();
    },
    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({ email, password });
      return { session: data.session, user: data.user, error };
    },
    async signInWithPassword(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      return { session: data.session, user: data.user, error };
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      return { error };
    },
  };
}
