import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** 根据环境变量判断是否允许初始化 Supabase 客户端。 */
export function resolveSupabaseConfigured(
  supabaseUrl: string | undefined,
  supabaseAnonKey: string | undefined
): boolean {
  return Boolean(supabaseUrl?.trim() && supabaseAnonKey?.trim());
}

/** 未配置云端凭据时禁止初始化客户端，避免 getSession 挂起阻塞登录门。 */
export const isSupabaseConfigured = resolveSupabaseConfigured(url, anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
