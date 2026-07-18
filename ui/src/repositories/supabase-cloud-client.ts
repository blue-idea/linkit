import type { SupabaseClient } from '@supabase/supabase-js';
import type { CloudBookmarksClient, CloudBookmarksRow } from './cloud';
import type { LibraryEnvelope } from '../domain/library';

/** 将 Supabase JS 客户端适配为 CloudRepository 可注入的 CloudBookmarksClient。 */
export function createSupabaseCloudClient(client: SupabaseClient | null): CloudBookmarksClient | null {
  if (!client) return null;

  return {
    async getSessionUserId() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session?.user?.id ?? null;
    },

    async loadRow(userId) {
      const { data, error } = await client
        .from('user_bookmarks')
        .select('user_id,data,schema_version,revision,updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      return {
        row: (data as CloudBookmarksRow | null) ?? null,
        error: error ? { message: error.message, code: error.code } : null,
      };
    },

    async insertRow(input) {
      const { data, error } = await client
        .from('user_bookmarks')
        .insert({
          user_id: input.userId,
          data: input.data,
          schema_version: input.schemaVersion,
          revision: input.revision,
        })
        .select('revision,updated_at')
        .single();
      return {
        row: data as { revision: number; updated_at: string } | null,
        error: error ? { message: error.message, code: error.code } : null,
      };
    },

    async updateRow(input: {
      userId: string;
      expectedRevision: number;
      data: LibraryEnvelope['data'];
      schemaVersion: number;
      nextRevision: number;
    }) {
      const { data, error } = await client
        .from('user_bookmarks')
        .update({
          data: input.data,
          schema_version: input.schemaVersion,
          revision: input.nextRevision,
        })
        .eq('user_id', input.userId)
        .eq('revision', input.expectedRevision)
        .select('revision,updated_at')
        .maybeSingle();
      return {
        row: data as { revision: number; updated_at: string } | null,
        error: error ? { message: error.message, code: error.code } : null,
      };
    },
  };
}
