import { CLOUD_REPOSITORY_CONFIG } from '../config/cloud-repository';
import { REPOSITORY_CONFIG } from '../config/repository';
import { validateLibraryEnvelope, type LibraryEnvelope } from '../domain/library';
import {
  RepositoryError,
  type LibraryRepository,
  type RepositoryLoadResult,
  type SaveResult,
  type StorageSummary,
} from './types';

export interface CloudBookmarksRow {
  user_id: string;
  data: unknown;
  schema_version: number;
  revision: number;
  updated_at: string;
}

/** 可注入的云资料库客户端，便于单测与真实 Supabase 适配。 */
export interface CloudBookmarksClient {
  getSessionUserId(): Promise<string | null>;
  loadRow(userId: string): Promise<{
    row: CloudBookmarksRow | null;
    error: { message: string; code?: string } | null;
  }>;
  insertRow(input: {
    userId: string;
    data: LibraryEnvelope['data'];
    schemaVersion: number;
    revision: number;
  }): Promise<{
    row: { revision: number; updated_at: string } | null;
    error: { message: string; code?: string } | null;
  }>;
  updateRow(input: {
    userId: string;
    expectedRevision: number;
    data: LibraryEnvelope['data'];
    schemaVersion: number;
    nextRevision: number;
  }): Promise<{
    row: { revision: number; updated_at: string } | null;
    error: { message: string; code?: string } | null;
  }>;
}

export interface CloudRepository extends LibraryRepository {
  create(document: LibraryEnvelope): Promise<SaveResult>;
}

export interface CloudRepositoryOptions {
  client: CloudBookmarksClient | null;
}

function assertValidDocument(document: LibraryEnvelope): void {
  const validation = validateLibraryEnvelope(document);
  if (!validation.success) {
    throw new RepositoryError({
      ...CLOUD_REPOSITORY_CONFIG.errors.documentInvalid,
      details: { issueCount: validation.errors.length },
    });
  }
}

function mapRequestError(error: { message: string; code?: string } | null | undefined): RepositoryError {
  return new RepositoryError({
    ...CLOUD_REPOSITORY_CONFIG.errors.requestFailed,
    message: error?.message?.trim() || CLOUD_REPOSITORY_CONFIG.errors.requestFailed.message,
    details: { providerCode: error?.code ?? null },
  });
}

function toIsoTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RepositoryError({
      ...CLOUD_REPOSITORY_CONFIG.errors.documentInvalid,
      details: { reason: 'updated_at is not a valid timestamp' },
    });
  }
  return date.toISOString();
}

function rowToEnvelope(row: CloudBookmarksRow): LibraryEnvelope {
  const candidate = {
    format: 'linkit-library' as const,
    schemaVersion: row.schema_version,
    revision: row.revision,
    updatedAt: toIsoTimestamp(row.updated_at),
    data: row.data,
  };
  const validation = validateLibraryEnvelope(candidate);
  if (!validation.success) {
    throw new RepositoryError({
      ...CLOUD_REPOSITORY_CONFIG.errors.documentInvalid,
      details: { issueCount: validation.errors.length },
    });
  }
  // schema_version 列必须与信封一致。
  if (row.schema_version !== validation.data.schemaVersion) {
    throw new RepositoryError({
      ...CLOUD_REPOSITORY_CONFIG.errors.documentInvalid,
      details: { reason: 'schema_version mismatch' },
    });
  }
  return validation.data;
}

class SupabaseCloudRepository implements CloudRepository {
  constructor(private readonly client: CloudBookmarksClient | null) {}

  private requireClient(): CloudBookmarksClient {
    if (!this.client) {
      throw new RepositoryError({ ...CLOUD_REPOSITORY_CONFIG.errors.authRequired });
    }
    return this.client;
  }

  private async requireUserId(): Promise<string> {
    const client = this.requireClient();
    const userId = await client.getSessionUserId();
    if (!userId) {
      throw new RepositoryError({ ...CLOUD_REPOSITORY_CONFIG.errors.authRequired });
    }
    return userId;
  }

  async load(): Promise<RepositoryLoadResult> {
    const client = this.requireClient();
    const userId = await this.requireUserId();
    const { row, error } = await client.loadRow(userId);
    if (error) throw mapRequestError(error);
    if (!row) return { state: 'empty' };
    // 二次检查：RLS 之外再校验会话用户与行归属一致。
    if (row.user_id !== userId) {
      throw new RepositoryError({
        ...CLOUD_REPOSITORY_CONFIG.errors.requestFailed,
        message: 'Cloud row user_id does not match the authenticated session',
      });
    }
    return {
      state: 'found',
      snapshot: { source: 'cloud', envelope: rowToEnvelope(row) },
    };
  }

  async create(document: LibraryEnvelope): Promise<SaveResult> {
    assertValidDocument(document);
    const client = this.requireClient();
    const userId = await this.requireUserId();
    const { row, error } = await client.insertRow({
      userId,
      data: document.data,
      schemaVersion: document.schemaVersion,
      revision: 0,
    });
    if (error) {
      // 唯一约束冲突：重新 load 后走正常 revision 流程，不盲目覆盖。
      const isUniqueViolation =
        error.code === '23505' || /duplicate|unique/i.test(error.message);
      if (isUniqueViolation) {
        const existing = await this.load();
        if (existing.state === 'found') {
          return this.save(document, existing.snapshot.envelope.revision);
        }
      }
      throw mapRequestError(error);
    }
    if (!row) throw mapRequestError({ message: 'Insert returned no row' });
    return { revision: row.revision, updatedAt: toIsoTimestamp(row.updated_at) };
  }

  async save(document: LibraryEnvelope, expectedRevision: number): Promise<SaveResult> {
    assertValidDocument(document);
    const client = this.requireClient();
    const userId = await this.requireUserId();
    const { row, error } = await client.updateRow({
      userId,
      expectedRevision,
      data: document.data,
      schemaVersion: document.schemaVersion,
      nextRevision: expectedRevision + 1,
    });
    if (error) throw mapRequestError(error);
    // 零行且无错误 → revision 乐观锁冲突。
    if (!row) {
      throw new RepositoryError({
        ...REPOSITORY_CONFIG.errors.revisionConflict,
        ...CLOUD_REPOSITORY_CONFIG.errors.revisionConflict,
        details: { expectedRevision },
      });
    }
    return { revision: row.revision, updatedAt: toIsoTimestamp(row.updated_at) };
  }

  /** Overwrite Cloud：先读最新 revision，再执行一次条件保存。 */
  async replace(document: LibraryEnvelope): Promise<SaveResult> {
    assertValidDocument(document);
    const loaded = await this.load();
    if (loaded.state === 'found') {
      return this.save(document, loaded.snapshot.envelope.revision);
    }
    return this.create(document);
  }

  async describe(): Promise<StorageSummary> {
    const loaded = await this.load();
    if (loaded.state !== 'found') {
      return { exists: false, revision: null, updatedAt: null, bookmarkCount: null, byteSize: 0 };
    }
    const { envelope } = loaded.snapshot;
    return {
      exists: true,
      revision: envelope.revision,
      updatedAt: envelope.updatedAt,
      bookmarkCount: envelope.data.bookmarks.length,
      byteSize: new TextEncoder().encode(JSON.stringify(envelope)).byteLength,
    };
  }
}

export function createCloudRepository(options: CloudRepositoryOptions): CloudRepository {
  return new SupabaseCloudRepository(options.client);
}
