import type { LibraryEnvelope } from '../../domain/library';
import { validateLibraryEnvelope } from '../../domain/library';
import type {
  LibraryRepository,
  RepositoryLoadResult,
  StorageMode,
  StorageSummary,
} from '../../repositories';
import { RepositoryError } from '../../repositories';

export type { StorageMode };

export interface CloudDraftStore {
  read(): Promise<{ state: 'found' | 'empty'; draftJson?: string }>;
  write(draftJson: string): Promise<void>;
  clear(): Promise<void>;
}

export interface SwitchPreview {
  sourceMode: StorageMode;
  targetMode: StorageMode;
  sourceSummary: StorageSummary;
  targetSummary: StorageSummary;
  sourceEnvelope: LibraryEnvelope | null;
}

export type SwitchChoice = 'use_target' | 'overwrite_target' | 'cancel';
export type ConflictChoice = 'use_cloud_copy' | 'overwrite_cloud' | 'cancel';
export type DraftChoice = 'keep_draft' | 'discard' | 'cancel';

export interface SwitchResult {
  status: 'switched' | 'cancelled' | 'failed';
  activeMode: StorageMode;
  envelope?: LibraryEnvelope | null;
  error?: { code: string; message: string };
}

export interface ConflictSession {
  status: 'conflict';
  choices: ConflictChoice[];
  cloudEnvelope: LibraryEnvelope;
  clientEnvelope: LibraryEnvelope | null;
}

export interface ConflictResolveResult {
  status: 'resolved' | 'cancelled' | 'failed';
  envelope?: LibraryEnvelope | null;
  error?: { code: string; message: string };
}

export interface DirtyDraftInspection {
  status: 'clean' | 'dirty_pending';
  baseRevision?: number;
  cloudRevision?: number | null;
  draftEnvelope?: LibraryEnvelope | null;
}

export interface DraftResolveResult {
  status: 'resolved' | 'cancelled';
  envelope?: LibraryEnvelope | null;
}

export interface StorageSwitchCoordinator {
  getActiveMode(): StorageMode;
  loadActiveLibrary(): Promise<RepositoryLoadResult>;
  prepareSwitch(targetMode: StorageMode): Promise<SwitchPreview>;
  confirmSwitch(choice: SwitchChoice): Promise<SwitchResult>;
  beginRevisionConflict(
    cloudEnvelope: LibraryEnvelope,
    clientEnvelope?: LibraryEnvelope
  ): Promise<ConflictSession>;
  resolveRevisionConflict(choice: ConflictChoice): Promise<ConflictResolveResult>;
  isAutosavePaused(): boolean;
  inspectDirtyDraft(): Promise<DirtyDraftInspection>;
  resolveDirtyDraft(choice: DraftChoice): Promise<DraftResolveResult>;
}

export interface StorageSwitchCoordinatorOptions {
  activeMode: StorageMode;
  repositories: Record<StorageMode, LibraryRepository>;
  draft: CloudDraftStore;
  now?: () => string;
}

interface PendingSwitch {
  targetMode: StorageMode;
  sourceMode: StorageMode;
  sourceEnvelope: LibraryEnvelope | null;
}

interface PendingConflict {
  cloudEnvelope: LibraryEnvelope;
  clientEnvelope: LibraryEnvelope | null;
}

interface PendingDraft {
  baseRevision: number;
  draftEnvelope: LibraryEnvelope;
}

function emptySummary(): StorageSummary {
  return { exists: false, revision: null, updatedAt: null, bookmarkCount: null, byteSize: 0 };
}

function envelopeFromLoad(result: RepositoryLoadResult): LibraryEnvelope | null {
  if (result.state === 'found') return result.snapshot.envelope;
  if (result.state === 'recovery_available') return result.recovery.envelope;
  return null;
}

function parseDirtyDraft(draftJson: string): { baseRevision: number; envelope: LibraryEnvelope } | null {
  try {
    const parsed = JSON.parse(draftJson) as {
      format?: string;
      dirty?: boolean;
      baseRevision?: number;
      schemaVersion?: number;
      updatedAt?: string;
      data?: unknown;
    };
    if (parsed.format !== 'linkit-cloud-draft' || parsed.dirty !== true) return null;
    if (typeof parsed.baseRevision !== 'number' || parsed.baseRevision < 0) return null;
    const candidate = {
      format: 'linkit-library' as const,
      schemaVersion: parsed.schemaVersion ?? 1,
      revision: parsed.baseRevision,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      data: parsed.data,
    };
    const validation = validateLibraryEnvelope(candidate);
    if (!validation.success) return null;
    return { baseRevision: parsed.baseRevision, envelope: validation.data };
  } catch {
    return null;
  }
}

class StorageSwitchCoordinatorImpl implements StorageSwitchCoordinator {
  private activeMode: StorageMode;
  private autosavePaused = false;
  private pendingSwitch: PendingSwitch | null = null;
  private pendingConflict: PendingConflict | null = null;
  private pendingDraft: PendingDraft | null = null;
  private readonly repositories: Record<StorageMode, LibraryRepository>;
  private readonly draft: CloudDraftStore;

  constructor(options: StorageSwitchCoordinatorOptions) {
    this.activeMode = options.activeMode;
    this.repositories = options.repositories;
    this.draft = options.draft;
  }

  getActiveMode(): StorageMode {
    return this.activeMode;
  }

  loadActiveLibrary(): Promise<RepositoryLoadResult> {
    return this.repositories[this.activeMode].load();
  }

  isAutosavePaused(): boolean {
    return this.autosavePaused;
  }

  /** REQ-004-AC-001：切换前仅收集摘要，不改模式或数据。 */
  async prepareSwitch(targetMode: StorageMode): Promise<SwitchPreview> {
    const sourceMode = this.activeMode;
    const [sourceSummary, targetSummary, sourceLoad] = await Promise.all([
      this.repositories[sourceMode].describe(),
      this.repositories[targetMode].describe(),
      this.repositories[sourceMode].load(),
    ]);
    const sourceEnvelope = envelopeFromLoad(sourceLoad);
    this.pendingSwitch = { targetMode, sourceMode, sourceEnvelope };
    return {
      sourceMode,
      targetMode,
      sourceSummary: sourceSummary.exists ? sourceSummary : emptySummary(),
      targetSummary: targetSummary.exists ? targetSummary : emptySummary(),
      sourceEnvelope,
    };
  }

  async confirmSwitch(choice: SwitchChoice): Promise<SwitchResult> {
    if (!this.pendingSwitch) {
      return {
        status: 'failed',
        activeMode: this.activeMode,
        error: { code: 'INVALID_ARGUMENT', message: 'No pending storage switch' },
      };
    }
    const pending = this.pendingSwitch;

    if (choice === 'cancel') {
      this.pendingSwitch = null;
      return { status: 'cancelled', activeMode: this.activeMode };
    }

    try {
      if (choice === 'overwrite_target') {
        if (!pending.sourceEnvelope) {
          throw new RepositoryError({
            code: 'DOCUMENT_INVALID',
            message: 'Source library is empty',
            retryable: false,
          });
        }
        // 先写入目标端，成功后才切换模式（REQ-004-AC-003）。
        await this.repositories[pending.targetMode].replace(pending.sourceEnvelope);
      }

      this.activeMode = pending.targetMode;
      this.pendingSwitch = null;
      const loaded = await this.loadActiveLibrary();
      return {
        status: 'switched',
        activeMode: this.activeMode,
        envelope: envelopeFromLoad(loaded),
      };
    } catch (error) {
      // REQ-004-AC-004：写入失败保持原模式。
      this.pendingSwitch = null;
      const appError = error as { code?: string; message?: string };
      return {
        status: 'failed',
        activeMode: this.activeMode,
        error: {
          code: appError.code ?? 'CLOUD_REQUEST_FAILED',
          message: appError.message ?? 'Storage switch failed',
        },
      };
    }
  }

  /** REQ-003-AC-005：进入冲突态并暂停自动保存。 */
  async beginRevisionConflict(
    cloudEnvelope: LibraryEnvelope,
    clientEnvelope?: LibraryEnvelope
  ): Promise<ConflictSession> {
    this.autosavePaused = true;
    this.pendingConflict = {
      cloudEnvelope: structuredClone(cloudEnvelope),
      clientEnvelope: clientEnvelope ? structuredClone(clientEnvelope) : null,
    };
    return {
      status: 'conflict',
      choices: ['use_cloud_copy', 'overwrite_cloud', 'cancel'],
      cloudEnvelope: this.pendingConflict.cloudEnvelope,
      clientEnvelope: this.pendingConflict.clientEnvelope,
    };
  }

  async resolveRevisionConflict(choice: ConflictChoice): Promise<ConflictResolveResult> {
    if (!this.pendingConflict) {
      return {
        status: 'failed',
        error: { code: 'INVALID_ARGUMENT', message: 'No pending revision conflict' },
      };
    }
    const pending = this.pendingConflict;

    if (choice === 'cancel') {
      // Cancel 保持暂停，等待用户再次选择，不自动合并。
      return { status: 'cancelled', envelope: null };
    }

    try {
      if (choice === 'use_cloud_copy') {
        const loaded = await this.repositories.cloud.load();
        const envelope = envelopeFromLoad(loaded) ?? pending.cloudEnvelope;
        this.pendingConflict = null;
        this.autosavePaused = false;
        return { status: 'resolved', envelope };
      }

      // overwrite_cloud：用客户端文档 forceReplace。
      const document = pending.clientEnvelope ?? pending.cloudEnvelope;
      await this.repositories.cloud.replace(document);
      const loaded = await this.repositories.cloud.load();
      this.pendingConflict = null;
      this.autosavePaused = false;
      return { status: 'resolved', envelope: envelopeFromLoad(loaded) };
    } catch (error) {
      const appError = error as { code?: string; message?: string };
      return {
        status: 'failed',
        error: {
          code: appError.code ?? 'CLOUD_REQUEST_FAILED',
          message: appError.message ?? 'Conflict resolution failed',
        },
      };
    }
  }

  async inspectDirtyDraft(): Promise<DirtyDraftInspection> {
    const draftResult = await this.draft.read();
    if (draftResult.state !== 'found' || !draftResult.draftJson) {
      this.pendingDraft = null;
      return { status: 'clean' };
    }
    const parsed = parseDirtyDraft(draftResult.draftJson);
    if (!parsed) {
      this.pendingDraft = null;
      return { status: 'clean' };
    }
    const cloudLoad = await this.repositories.cloud.load();
    const cloudEnvelope = envelopeFromLoad(cloudLoad);
    this.pendingDraft = { baseRevision: parsed.baseRevision, draftEnvelope: parsed.envelope };
    return {
      status: 'dirty_pending',
      baseRevision: parsed.baseRevision,
      cloudRevision: cloudEnvelope?.revision ?? null,
      draftEnvelope: parsed.envelope,
    };
  }

  async resolveDirtyDraft(choice: DraftChoice): Promise<DraftResolveResult> {
    if (choice === 'cancel') {
      return { status: 'cancelled' };
    }
    if (choice === 'discard') {
      await this.draft.clear();
      this.pendingDraft = null;
      return { status: 'resolved', envelope: null };
    }
    // keep_draft：返回草稿内容供 UI 水合，清理 dirty 标记由调用方在成功同步后处理。
    const envelope = this.pendingDraft?.draftEnvelope ?? null;
    this.pendingDraft = null;
    return { status: 'resolved', envelope };
  }
}

export function createStorageSwitchCoordinator(
  options: StorageSwitchCoordinatorOptions
): StorageSwitchCoordinator {
  return new StorageSwitchCoordinatorImpl(options);
}
