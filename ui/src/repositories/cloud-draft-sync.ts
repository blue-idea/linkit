import { CLOUD_REPOSITORY_CONFIG } from '../config/cloud-repository';
import type { LibraryEnvelope } from '../domain/library';
import type { CloudRepository } from './cloud';
import type { SaveResult } from './types';

export interface CloudDraftBindings {
  writeCloudDraft(request: { draftJson: string }): Promise<void>;
  clearCloudDraft(): Promise<void>;
}

export interface SaveCloudLibraryWithDraftOptions {
  repository: CloudRepository;
  draft: CloudDraftBindings;
  document: LibraryEnvelope;
  expectedRevision: number;
  now?: () => string;
}

/** 构建 dirty 云草稿 JSON（对齐 data.md §5.3）。 */
export function buildCloudDraftJson(
  document: LibraryEnvelope,
  baseRevision: number,
  updatedAt: string
): string {
  return JSON.stringify({
    format: CLOUD_REPOSITORY_CONFIG.draftFormat,
    schemaVersion: document.schemaVersion,
    baseRevision,
    dirty: true,
    updatedAt,
    data: document.data,
  });
}

/**
 * 云保存前先落 dirty 草稿；成功后清理；失败保留草稿且不返回伪成功。
 * REQ-003-AC-004、REQ-027-AC-002~003
 */
export async function saveCloudLibraryWithDraft(
  options: SaveCloudLibraryWithDraftOptions
): Promise<SaveResult> {
  const now = options.now ?? (() => new Date().toISOString());
  const updatedAt = now();
  await options.draft.writeCloudDraft({
    draftJson: buildCloudDraftJson(options.document, options.expectedRevision, updatedAt),
  });

  const result = await options.repository.save(options.document, options.expectedRevision);
  await options.draft.clearCloudDraft();
  return result;
}
