import { supabase } from './supabase';
import type { LibraryData } from './types';

const missingCloudConfigMessage = 'Cloud storage is not configured';

export async function loadCloudLibrary(userId: string): Promise<LibraryData | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_bookmarks')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('loadCloudLibrary error', error);
    return null;
  }
  return (data?.data as LibraryData) ?? null;
}

export async function saveCloudLibrary(userId: string, lib: LibraryData): Promise<{ error: string | null }> {
  if (!supabase) return { error: missingCloudConfigMessage };

  const { error } = await supabase
    .from('user_bookmarks')
    .upsert({ user_id: userId, data: lib as unknown as Record<string, unknown> }, { onConflict: 'user_id' });
  if (error) return { error: error.message };
  return { error: null };
}
